import React, { useRef, useState, useMemo } from "react";
import axios from "axios";
import { notify } from '../common/Toast';

const Receipt = ({ order, items, onClose }) => {
    const receiptRef = useRef(null);

    const [isGenerating, setIsGenerating] = useState(false);
    // eslint-disable-next-line no-unused-vars
    const [isUploading, setIsUploading] = useState(false);

    const [pdfUrl, setPdfUrl] = useState(null);
    const [backendPdfUrl, setBackendPdfUrl] = useState(null);

    const [showPreview, setShowPreview] = useState(false);
    const [receiptId, setReceiptId] = useState(null);
    const [showPdfModal, setShowPdfModal] = useState(false);

    // Timeline progress steps
    const STEPS = useMemo(
        () => [
            { key: "idle", label: "Siap", icon: "⚡" },
            { key: "libs", label: "Load Libs", icon: "📚" },
            { key: "capture", label: "Capture", icon: "📸" },
            { key: "pdf", label: "PDF", icon: "📄" },
            { key: "upload", label: "Upload", icon: "☁️" },
            { key: "done", label: "Selesai", icon: "✅" },
        ],
        []
    );
    const [currentStepIndex, setCurrentStepIndex] = useState(0);

    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent
    );

    const isAndroid = /Android/i.test(navigator.userAgent);

    const formatRupiah = (number) => {
        const num = Number(number);
        if (isNaN(num)) return "Rp 0";
        return new Intl.NumberFormat("id-ID", {
            style: "currency",
            currency: "IDR",
            minimumFractionDigits: 0,
        }).format(num);
    };

    const formatDate = (dateString) => {
        if (!dateString) return "-";
        return new Date(dateString).toLocaleString("id-ID", {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    // Calculate subtotal
    const subtotal = useMemo(() => {
        return items.reduce((sum, item) => {
            const unit = Number(item.price_snapshot || item.unit_price_snapshot || 0);
            const qty = Number(item.qty || 0);
            const itemPrice = unit * qty;

            const modifiersPrice =
                (item.modifiers || []).reduce((mSum, mod) => {
                    return mSum + Number(mod.price_delta_snapshot || 0) * Number(mod.qty || 1);
                }, 0) * qty;

            return sum + itemPrice + modifiersPrice;
        }, 0);
    }, [items]);

    // Load libraries
    const loadLibraries = async () => {
        if (window.jsPDF && window.html2canvas) {
            return { jsPDF: window.jsPDF, html2canvas: window.html2canvas };
        }

        if (!window.html2canvas) {
            await new Promise((resolve, reject) => {
                const script = document.createElement("script");
                script.src = "https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js";
                script.onload = resolve;
                script.onerror = reject;
                document.head.appendChild(script);
            });
        }

        if (!window.jsPDF) {
            await new Promise((resolve, reject) => {
                const script = document.createElement("script");
                script.src = "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";
                script.onload = resolve;
                script.onerror = reject;
                document.head.appendChild(script);
            });
        }

        return {
            jsPDF: window.jspdf.jsPDF,
            html2canvas: window.html2canvas,
        };
    };

    // Upload PDF to backend
    const uploadPDFToBackend = async (pdfBlob) => {
        try {
            setIsUploading(true);

            const formData = new FormData();
            const filename = `receipt-${order.order_no}-${Date.now()}.pdf`;
            formData.append("pdf", pdfBlob, filename);
            formData.append("orderId", order.id);
            formData.append("customerName", order.customer_name || "Guest");

            const API_BASE_URL = process.env.REACT_APP_API_URL;

            const response = await axios.post(`${API_BASE_URL}/receipts/upload`, formData, {
                headers: { "Content-Type": "multipart/form-data" },
            });

            if (response.data?.success) {
                setReceiptId(response.data.data.receiptId);
                setBackendPdfUrl(response.data.data.pdfUrl);
                return response.data.data.pdfUrl;
            }

            throw new Error(response.data?.message || "Upload gagal");
        } catch (error) {
            console.error("Error uploading PDF:", error);
            throw new Error("Gagal upload PDF ke server: " + (error.response?.data?.message || error.message));
        } finally {
            setIsUploading(false);
        }
    };

    // Generate PDF
    const generatePDF = async () => {
        setIsGenerating(true);
        setCurrentStepIndex(0);
        setShowPreview(false);

        try {
            // Step 1: Load libraries
            setCurrentStepIndex(1);
            await new Promise((resolve) => setTimeout(resolve, 200));
            const { jsPDF, html2canvas } = await loadLibraries();

            // Step 2: Capture struk
            setCurrentStepIndex(2);
            await new Promise((resolve) => setTimeout(resolve, 200));

            const element = receiptRef.current;
            if (!element) throw new Error("Receipt element tidak ditemukan");

            const canvas = await html2canvas(element, {
                scale: isAndroid ? 4 : 3, // ✅ Android butuh scale lebih tinggi
                useCORS: true,
                backgroundColor: "#ffffff",
                logging: false,
                windowWidth: element.scrollWidth,
                windowHeight: element.scrollHeight,
                imageTimeout: 0,
                removeContainer: true,
                // ✅ Optimasi khusus untuk cross-platform compatibility
                pixelRatio: isAndroid ? 4 : 3,
                foreignObjectRendering: false, // hindari blur
                allowTaint: false,
                letterRendering: true, // ✅ Android specific
                ignoreElements: (el) => {
                    // Skip elements yang bisa cause render issues di Android
                    return el.tagName === 'SCRIPT' || el.tagName === 'STYLE';
                },
                onclone: (doc) => {
                    const el = doc.querySelector('[data-receipt="true"]');
                    if (!el) return;

                    // ✅ Optimasi rendering untuk cross-platform thermal printer
                    el.style.background = "#fff";
                    el.style.color = "#000";
                    el.style.filter = "none";
                    el.style.opacity = "1";
                    
                    // ✅ Android-specific font optimizations
                    if (isAndroid) {
                        el.style.textRendering = "geometricPrecision";
                        el.style.webkitFontSmoothing = "never";
                        el.style.fontSmooth = "never";
                        el.style.mozOsxFontSmoothing = "unset";
                        el.style.fontVariantLigatures = "none";
                    } else {
                        el.style.textRendering = "optimizeSpeed";
                        el.style.webkitFontSmoothing = "none";
                        el.style.mozOsxFontSmoothing = "unset";
                    }

                    el.querySelectorAll("*").forEach((node) => {
                        node.style.color = "#000";
                        node.style.background = "transparent";
                        node.style.boxShadow = "none";
                        node.style.textShadow = "none";
                        node.style.filter = "none";
                        node.style.opacity = "1";
                        
                        // ✅ Platform-specific optimizations
                        if (isAndroid) {
                            node.style.textRendering = "geometricPrecision";
                            node.style.webkitFontSmoothing = "never";
                            node.style.fontSmooth = "never";
                            node.style.fontVariantLigatures = "none";
                            node.style.textSizeAdjust = "100%";
                            // Force font weight to be more pronounced on Android
                            const weight = window.getComputedStyle(node).fontWeight;
                            if (parseInt(weight) >= 700) {
                                node.style.fontWeight = "900";
                            } else if (parseInt(weight) >= 600) {
                                node.style.fontWeight = "800";
                            }
                        } else {
                            node.style.textRendering = "optimizeSpeed";
                            node.style.webkitFontSmoothing = "none";
                            node.style.mozOsxFontSmoothing = "unset";
                        }
                    });
                },
            });

            // Step 3: Create PDF
            setCurrentStepIndex(3);
            await new Promise((resolve) => setTimeout(resolve, 200));

            // ✅ PNG lebih tajam untuk teks thermal (hindari JPEG)
            const imgData = canvas.toDataURL("image/png", 1.0); // ✅ Max quality

            // ✅ pakai area cetak 48mm (sesuai printer pocket 58mm)
            const pdfWidth = 48;
            const pdfHeight = (canvas.height * pdfWidth) / canvas.width + (isAndroid ? 4 : 2);

            const pdf = new jsPDF({
                orientation: "portrait",
                unit: "mm",
                format: [pdfWidth, pdfHeight],
                compress: false, // ✅ No compression untuk quality maksimal
                precision: 16, // ✅ Precision tinggi untuk Android
            });

            // ✅ Android specific image handling
            pdf.addImage(
                imgData, 
                "PNG", 
                0, 
                0, 
                pdfWidth, 
                pdfHeight - (isAndroid ? 4 : 2),
                undefined,
                isAndroid ? "MEDIUM" : "FAST" // ✅ Quality setting berdasarkan platform
            );

            const blob = pdf.output("blob");
            const url = URL.createObjectURL(blob);
            setPdfUrl(url);

            // Step 4: Upload to backend
            setCurrentStepIndex(4);
            await new Promise((resolve) => setTimeout(resolve, 200));
            await uploadPDFToBackend(blob);

            // Step 5: Done!
            setCurrentStepIndex(5);
            await new Promise((resolve) => setTimeout(resolve, 200));
            setShowPreview(true);
        } catch (error) {
            console.error("Error generating PDF:", error);
            notify.error("❌ Gagal membuat PDF: " + (error?.message || String(error)));
        } finally {
            setIsGenerating(false);
        }
    };

    // Preview PDF from backend as blob
    const previewPDFFromBackend = async () => {
        if (!backendPdfUrl) {
            notify.warning("PDF belum tersedia di server.");
            return;
        }

        try {
            const loadingToast = document.createElement("div");
            loadingToast.id = "pdf-loading-toast";
            loadingToast.innerHTML = "📄 Loading PDF...";
            loadingToast.style.cssText =
                "position:fixed;top:20px;right:20px;background:#333;color:#fff;padding:12px 24px;border-radius:8px;z-index:9999;font-family:system-ui;box-shadow:0 4px 12px rgba(0,0,0,0.3);";
            document.body.appendChild(loadingToast);

            const response = await fetch(backendPdfUrl, { method: "GET", cache: "no-cache" });
            if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);

            const blob = await response.blob();
            const blobUrl = URL.createObjectURL(blob);

            const toast = document.getElementById("pdf-loading-toast");
            if (toast) document.body.removeChild(toast);

            const newWindow = window.open(blobUrl, "_blank");
            if (!newWindow) {
                notify.warning("Pop-up diblokir! Silakan izinkan pop-up untuk preview PDF.");
                URL.revokeObjectURL(blobUrl);
                return;
            }

            setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
        } catch (error) {
            console.error("Error loading PDF:", error);
            const toast = document.getElementById("pdf-loading-toast");
            if (toast) document.body.removeChild(toast);
            notify.error("❌ Gagal memuat PDF: " + error.message);
        }
    };

    const previewPDF = () => {
        if (!pdfUrl && !backendPdfUrl) {
            notify.warning("⚠️ PDF belum tersedia. Silakan generate PDF terlebih dahulu.");
            return;
        }

        if (isMobile) {
            setShowPdfModal(true);
            return;
        }

        if (pdfUrl) {
            const newWindow = window.open(pdfUrl, "_blank");
            if (!newWindow) notify.warning("Pop-up diblokir! Silakan izinkan pop-up untuk preview PDF.");
        } else if (backendPdfUrl) {
            previewPDFFromBackend();
        }
    };

    const downloadPDF = () => {
        if (!pdfUrl && !backendPdfUrl) {
            notify.warning("⚠️ PDF belum tersedia.");
            return;
        }

        const link = document.createElement("a");
        link.href = pdfUrl || backendPdfUrl;
        link.download = `receipt-${order.order_no || "struk"}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        const toast = document.createElement("div");
        toast.textContent = "✅ PDF sedang didownload...";
        toast.style.cssText =
            "position:fixed;bottom:20px;right:20px;background:#10b981;color:#fff;padding:12px 24px;border-radius:8px;z-index:9999;font-family:system-ui;box-shadow:0 4px 12px rgba(0,0,0,0.3);";
        document.body.appendChild(toast);
        setTimeout(() => document.body.removeChild(toast), 3000);
    };

    const resetPDF = () => {
        setShowPreview(false);
        setPdfUrl(null);
        setBackendPdfUrl(null);
        setReceiptId(null);
    };

    // Helper for responsive UI (tanpa re-render listener, cukup baca sekali)
    const isSmall = typeof window !== "undefined" ? window.innerWidth < 640 : false;

    return (
        <div
            style={{
                position: "fixed",
                inset: 0,
                backgroundColor: "rgba(0, 0, 0, 0.5)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                zIndex: 9999,
                padding: "16px",
            }}
        >
            <div
                style={{
                    backgroundColor: "#ffffff",
                    borderRadius: "12px",
                    maxWidth: "900px",
                    width: "100%",
                    maxHeight: "90vh",
                    overflow: "auto",
                    boxShadow: "0 10px 40px rgba(0,0,0,0.2)",
                }}
            >
                {/* Header */}
                <div
                    style={{
                        padding: "16px 20px",
                        borderBottom: "1px solid #e5e7eb",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        position: "sticky",
                        top: 0,
                        backgroundColor: "#ffffff",
                        zIndex: 10,
                    }}
                >
                    <h2 style={{ margin: 0, fontSize: "18px", fontWeight: 800, color: "#111827" }}>
                        📄 Struk - #{order.order_no}
                    </h2>
                    <button
                        onClick={onClose}
                        style={{
                            background: "none",
                            border: "none",
                            fontSize: "24px",
                            cursor: "pointer",
                            color: "#6b7280",
                            padding: "4px 8px",
                            borderRadius: "6px",
                        }}
                    >
                        ✕
                    </button>
                </div>

                {/* Content */}
                <div style={{ padding: "20px" }}>
                    {/* Timeline */}
                    {isGenerating && (
                        <div
                            style={{
                                marginBottom: "20px",
                                padding: "16px",
                                backgroundColor: "#f9fafb",
                                borderRadius: "12px",
                                border: "1px solid #e5e7eb",
                            }}
                        >
                            <div style={{ marginBottom: "16px", textAlign: "center" }}>
                                <div
                                    style={{
                                        display: "inline-block",
                                        width: "32px",
                                        height: "32px",
                                        border: "3px solid #e5e7eb",
                                        borderTopColor: "#3b82f6",
                                        borderRadius: "50%",
                                        animation: "spin 1s linear infinite",
                                    }}
                                />
                            </div>

                            <div
                                style={{
                                    display: "flex",
                                    flexDirection: isSmall ? "column" : "row",
                                    gap: isSmall ? "12px" : "0",
                                    alignItems: isSmall ? "stretch" : "center",
                                    justifyContent: "space-between",
                                }}
                            >
                                {STEPS.map((step, idx) => (
                                    <div
                                        key={step.key}
                                        style={{
                                            flex: isSmall ? "none" : 1,
                                            display: "flex",
                                            flexDirection: isSmall ? "row" : "column",
                                            alignItems: "center",
                                            gap: isSmall ? "12px" : "8px",
                                            padding: isSmall ? "8px 12px" : "0",
                                            backgroundColor: idx === currentStepIndex ? (isSmall ? "#eff6ff" : "transparent") : "transparent",
                                            borderRadius: isSmall ? "8px" : "0",
                                            transition: "all 0.3s ease",
                                        }}
                                    >
                                        <div
                                            style={{
                                                width: "32px",
                                                height: "32px",
                                                minWidth: "32px",
                                                borderRadius: "50%",
                                                backgroundColor: idx <= currentStepIndex ? "#3b82f6" : "#e5e7eb",
                                                color: idx <= currentStepIndex ? "#ffffff" : "#9ca3af",
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "center",
                                                fontSize: "16px",
                                                fontWeight: 800,
                                                transition: "all 0.3s ease",
                                                boxShadow: idx === currentStepIndex ? "0 0 0 3px rgba(59, 130, 246, 0.2)" : "none",
                                            }}
                                        >
                                            {step.icon}
                                        </div>

                                        <div
                                            style={{
                                                fontSize: isSmall ? "13px" : "11px",
                                                fontWeight: idx <= currentStepIndex ? 700 : 600,
                                                color: idx <= currentStepIndex ? "#111827" : "#9ca3af",
                                                textAlign: isSmall ? "left" : "center",
                                                flex: isSmall ? 1 : "none",
                                                whiteSpace: isSmall ? "nowrap" : "normal",
                                            }}
                                        >
                                            {step.label}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div
                                style={{
                                    width: "100%",
                                    height: "4px",
                                    backgroundColor: "#e5e7eb",
                                    borderRadius: "2px",
                                    overflow: "hidden",
                                    marginTop: "16px",
                                }}
                            >
                                <div
                                    style={{
                                        height: "100%",
                                        backgroundColor: "#3b82f6",
                                        width: `${(currentStepIndex / (STEPS.length - 1)) * 100}%`,
                                        transition: "width 0.3s ease",
                                        borderRadius: "2px",
                                    }}
                                />
                            </div>
                        </div>
                    )}

                    {/* Buttons */}
                    {showPreview && !isGenerating && (
                        <div
                            style={{
                                display: "grid",
                                gridTemplateColumns: isSmall ? "1fr" : "repeat(2, 1fr)",
                                gap: "10px",
                                marginBottom: "20px",
                            }}
                        >
                            <button
                                onClick={previewPDF}
                                style={{
                                    padding: "12px 20px",
                                    backgroundColor: "#3b82f6",
                                    color: "#ffffff",
                                    border: "none",
                                    borderRadius: "8px",
                                    fontSize: "14px",
                                    fontWeight: 700,
                                    cursor: "pointer",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    gap: "8px",
                                }}
                            >
                                <span>👁️</span>
                                <span>Preview</span>
                            </button>

                            <button
                                onClick={resetPDF}
                                style={{
                                    padding: "12px 20px",
                                    backgroundColor: "#ef4444",
                                    color: "#ffffff",
                                    border: "none",
                                    borderRadius: "8px",
                                    fontSize: "14px",
                                    fontWeight: 700,
                                    cursor: "pointer",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    gap: "8px",
                                }}
                            >
                                <span>🔄</span>
                                <span>Reset</span>
                            </button>
                        </div>
                    )}

                    {!showPreview && !isGenerating && (
                        <div style={{ marginBottom: "20px", textAlign: "center" }}>
                            <button
                                onClick={generatePDF}
                                disabled={isGenerating}
                                style={{
                                    padding: "14px 28px",
                                    backgroundColor: isGenerating ? "#9ca3af" : "#3b82f6",
                                    color: "#ffffff",
                                    border: "none",
                                    borderRadius: "10px",
                                    fontSize: "15px",
                                    fontWeight: 800,
                                    cursor: isGenerating ? "not-allowed" : "pointer",
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: "10px",
                                }}
                            >
                                <span>⚡</span>
                                <span>{isGenerating ? "Generating..." : "Generate PDF"}</span>
                            </button>
                        </div>
                    )}

                    {(pdfUrl || backendPdfUrl) && (
                        <div
                            style={{
                                padding: "14px",
                                backgroundColor: "#f0fdf4",
                                border: "1px solid #bbf7d0",
                                borderRadius: "8px",
                                marginBottom: "16px",
                                fontSize: "13px",
                            }}
                        >
                            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                                <span>✅</span>
                                <span style={{ fontWeight: 700, color: "#166534" }}>PDF Berhasil Dibuat!</span>
                            </div>
                            {receiptId && (
                                <div style={{ fontSize: "12px", color: "#15803d", marginLeft: "26px" }}>
                                    ID:{" "}
                                    <code style={{ backgroundColor: "#dcfce7", padding: "2px 6px", borderRadius: "4px" }}>
                                        {receiptId}
                                    </code>
                                </div>
                            )}
                        </div>
                    )}

                    {/* STRUK (hidden offscreen) */}
                    <div style={{ position: "absolute", left: "-9999px", top: 0 }}>
                        <div
                            ref={receiptRef}
                            data-receipt="true"
                            style={{
                                width: "48mm", // ✅ area cetak efektif printer 58mm pocket
                                backgroundColor: "#ffffff",
                                color: "#000000",
                                fontFamily: isAndroid 
                                    ? '"Roboto Mono", "Droid Sans Mono", "Courier New", monospace'  // ✅ Android-optimized fonts
                                    : '"Courier New", "Liberation Mono", monospace', // ✅ iOS-optimized fonts
                                padding: 0,
                                margin: 0,
                                WebkitFontSmoothing: isAndroid ? "never" : "none",
                                MozOsxFontSmoothing: "unset",
                                textRendering: isAndroid ? "geometricPrecision" : "optimizeSpeed", // ✅ platform-specific
                                fontFeatureSettings: '"liga" 0', // matikan ligature untuk clarity
                                letterSpacing: isAndroid ? "0.2px" : "0px", // ✅ Android butuh spacing sedikit
                                lineHeight: "1.2", // ✅ line height optimal untuk thermal
                                fontVariantLigatures: "none", // ✅ Android compatibility
                                textSizeAdjust: "100%", // ✅ Prevent text scaling issues
                                transform: isAndroid ? "translateZ(0)" : "none" // ✅ Hardware acceleration untuk Android
                            }}
                        >
                            <div style={{ padding: "3mm" }}>
                                {/* HEADER */}
                                <div
                                    style={{
                                        textAlign: "center",
                                        marginBottom: "3mm",
                                        paddingBottom: "3mm",
                                        borderBottom: "1px solid #000", // ✅ jangan 2px
                                    }}
                                >
                                    <div style={{ 
                                        fontSize: isAndroid ? "14px" : "13px", // ✅ Android butuh sedikit lebih besar
                                        fontWeight: isAndroid ? 900 : 800, 
                                        letterSpacing: "0.5px", 
                                        marginBottom: "1mm", 
                                        textTransform: "uppercase",
                                        textShadow: isAndroid ? "0 0 1px #000" : "none" // ✅ Android text enhancement
                                    }}>
                                        KEDAI YURU
                                    </div>
                                    <div style={{ 
                                        fontSize: isAndroid ? "10px" : "9px", // ✅ Ukuran adjusted untuk Android
                                        fontWeight: isAndroid ? 700 : 600, 
                                        lineHeight: "1.3", 
                                        letterSpacing: "0.2px" 
                                    }}>
                                        Jl. Wonolopo (Sebrang Prima Futsal) RT.02 RW.07, Semarang · Telp: 0823-2497-5131
                                    </div>
                                </div>

                                {/* ORDER INFO */}
                                <div style={{ marginBottom: "3mm", paddingBottom: "3mm", borderBottom: "1px dashed #000" }}>
                                    <table style={{ 
                                        width: "100%", 
                                        borderCollapse: "collapse", 
                                        fontSize: isAndroid ? "11px" : "10px", // ✅ Android optimization
                                        fontWeight: isAndroid ? 700 : 600 
                                    }}>
                                        <tbody>
                                            <tr>
                                                <td style={{ 
                                                    padding: "1.2mm 0", 
                                                    fontWeight: isAndroid ? 800 : 700, 
                                                    width: "35%" 
                                                }}>Order</td>
                                                <td style={{ 
                                                    padding: "1.2mm 0", 
                                                    fontWeight: isAndroid ? 900 : 800, 
                                                    textAlign: "right" 
                                                }}>{order.order_no}</td>
                                            </tr>
                                            <tr>
                                                <td style={{ 
                                                    padding: "1.2mm 0", 
                                                    fontWeight: isAndroid ? 800 : 700 
                                                }}>Tanggal</td>
                                                <td style={{ 
                                                    padding: "1.2mm 0", 
                                                    fontWeight: isAndroid ? 700 : 600, 
                                                    textAlign: "right", 
                                                    fontSize: isAndroid ? "10px" : "9px" 
                                                }}>
                                                    {formatDate(order.created_at)}
                                                </td>
                                            </tr>
                                            <tr>
                                                <td style={{ 
                                                    padding: "1.2mm 0", 
                                                    fontWeight: isAndroid ? 800 : 700 
                                                }}>Customer</td>
                                                <td style={{ 
                                                    padding: "1.2mm 0", 
                                                    fontWeight: isAndroid ? 800 : 700, 
                                                    textAlign: "right" 
                                                }}>
                                                    {order.customer_name || "Guest"}
                                                </td>
                                            </tr>
                                            <tr>
                                                <td style={{ 
                                                    padding: "1.2mm 0", 
                                                    fontWeight: isAndroid ? 800 : 700 
                                                }}>Tipe</td>
                                                <td style={{ 
                                                    padding: "1.2mm 0", 
                                                    fontWeight: isAndroid ? 900 : 800, 
                                                    textAlign: "right", 
                                                    textTransform: "uppercase" 
                                                }}>
                                                    {order.type === "delivery" ? "DELIVERY" : order.type === "dine_in" ? "DINE IN" : order.type === "takeaway" ? "TAKEAWAY" : "PICKUP"}
                                                </td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>

                                {/* ITEMS */}
                                <div style={{ marginBottom: "3mm", paddingBottom: "3mm", borderBottom: "1px dashed #000" }}>
                                    <div style={{ 
                                        fontWeight: isAndroid ? 900 : 800, 
                                        marginBottom: "2mm", 
                                        fontSize: isAndroid ? "12px" : "11px", 
                                        textTransform: "uppercase", 
                                        letterSpacing: "0.3px" 
                                    }}>PESANAN</div>

                                    {items.map((item, idx) => {
                                        const unitPrice = Number(item.price_snapshot || item.unit_price_snapshot || 0);
                                        const qty = Number(item.qty || 0);
                                        const itemTotal = unitPrice * qty;

                                        return (
                                            <div key={idx} style={{ marginBottom: "2.8mm" }}>
                                                <div style={{ 
                                                    fontWeight: isAndroid ? 900 : 800, 
                                                    fontSize: isAndroid ? "11px" : "10px", 
                                                    marginBottom: "1.2mm", 
                                                    letterSpacing: "0.1px" 
                                                }}>
                                                    {item.product_name_snapshot}
                                                </div>

                                                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                                                    <tbody>
                                                        <tr>
                                                            <td style={{ 
                                                                paddingLeft: "2mm", 
                                                                fontSize: isAndroid ? "10px" : "9px", 
                                                                fontWeight: isAndroid ? 700 : 600 
                                                            }}>
                                                                {qty} x {formatRupiah(unitPrice)}
                                                            </td>
                                                            <td style={{ 
                                                                fontSize: isAndroid ? "11px" : "10px", 
                                                                fontWeight: isAndroid ? 900 : 800, 
                                                                textAlign: "right" 
                                                            }}>
                                                                {formatRupiah(itemTotal)}
                                                            </td>
                                                        </tr>
                                                    </tbody>
                                                </table>

                                                {/* MODIFIERS - ✅ no grey, no background */}
                                                {item.modifiers && item.modifiers.length > 0 && (
                                                    <div style={{ paddingLeft: "3mm", marginTop: "1.5mm" }}>
                                                        {item.modifiers.map((mod, midx) => {
                                                            const modPrice = Number(mod.price_delta_snapshot || 0);
                                                            return (
                                                                <div
                                                                    key={midx}
                                                                    style={{
                                                                        fontSize: isAndroid ? "10px" : "9px",
                                                                        fontWeight: isAndroid ? 700 : 600,
                                                                        display: "flex",
                                                                        justifyContent: "space-between",
                                                                        marginBottom: "1mm",
                                                                        lineHeight: "1.2",
                                                                        letterSpacing: "0.1px",
                                                                    }}
                                                                >
                                                                    <span>+ {mod.modifier_name_snapshot}</span>
                                                                    {modPrice > 0 && <span>+{formatRupiah(modPrice * qty)}</span>}
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* TOTALS */}
                                <div style={{ marginBottom: "3mm", paddingBottom: "3mm", borderBottom: "1px solid #000" }}>
                                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                                        <tbody>
                                            <tr>
                                                <td style={{ 
                                                    padding: "1.2mm 0", 
                                                    fontSize: isAndroid ? "11px" : "10px", 
                                                    fontWeight: isAndroid ? 800 : 700 
                                                }}>Subtotal</td>
                                                <td style={{ 
                                                    padding: "1.2mm 0", 
                                                    fontSize: isAndroid ? "11px" : "10px", 
                                                    fontWeight: isAndroid ? 900 : 800, 
                                                    textAlign: "right" 
                                                }}>
                                                    {formatRupiah(subtotal)}
                                                </td>
                                            </tr>
                                            
                                            {/* DISKON - tampilkan jika ada */}
                                            {order.discount_amount && Number(order.discount_amount) > 0 && (
                                                <tr>
                                                    <td style={{ 
                                                        padding: "1.2mm 0", 
                                                        fontSize: isAndroid ? "11px" : "10px", 
                                                        fontWeight: isAndroid ? 800 : 700 
                                                    }}>Diskon</td>
                                                    <td style={{ 
                                                        padding: "1.2mm 0", 
                                                        fontSize: isAndroid ? "11px" : "10px", 
                                                        fontWeight: isAndroid ? 900 : 800, 
                                                        textAlign: "right" 
                                                    }}>
                                                        -{formatRupiah(order.discount_amount)}
                                                    </td>
                                                </tr>
                                            )}
                                            
                                            {/* PAJAK - tampilkan jika ada */}
                                            {order.tax_amount && Number(order.tax_amount) > 0 && (
                                                <tr>
                                                    <td style={{ 
                                                        padding: "1.2mm 0", 
                                                        fontSize: isAndroid ? "11px" : "10px", 
                                                        fontWeight: isAndroid ? 800 : 700 
                                                    }}>Pajak</td>
                                                    <td style={{ 
                                                        padding: "1.2mm 0", 
                                                        fontSize: isAndroid ? "11px" : "10px", 
                                                        fontWeight: isAndroid ? 900 : 800, 
                                                        textAlign: "right" 
                                                    }}>
                                                        +{formatRupiah(order.tax_amount)}
                                                    </td>
                                                </tr>
                                            )}
                                            
                                            <tr>
                                                <td style={{ 
                                                    padding: "1.8mm 0 0 0", 
                                                    fontSize: isAndroid ? "13px" : "12px", 
                                                    fontWeight: 900, 
                                                    textTransform: "uppercase", 
                                                    letterSpacing: "0.5px",
                                                    textShadow: isAndroid ? "0 0 1px #000" : "none" // ✅ Android enhancement
                                                }}>TOTAL</td>
                                                <td style={{ 
                                                    padding: "1.8mm 0 0 0", 
                                                    fontSize: isAndroid ? "13px" : "12px", 
                                                    fontWeight: 900, 
                                                    textAlign: "right", 
                                                    letterSpacing: "0.2px",
                                                    textShadow: isAndroid ? "0 0 1px #000" : "none" // ✅ Android enhancement
                                                }}>
                                                    {formatRupiah(order.grand_total)}
                                                </td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>

                                {/* NOTES - ✅ no grey background */}
                                {order.notes && (
                                    <div style={{ margin: "2.5mm 0", padding: "2.5mm", border: "1px dashed #000", fontSize: "9px", fontWeight: 600 }}>
                                        <div style={{ fontWeight: 800, marginBottom: "1.2mm", textTransform: "uppercase", letterSpacing: "0.2px" }}>Catatan:</div>
                                        <div style={{ lineHeight: "1.3", letterSpacing: "0.1px" }}>{order.notes}</div>
                                    </div>
                                )}

                                {/* FOOTER */}
                                <div
                                    style={{
                                        textAlign: "center",
                                        marginTop: "3mm",
                                        paddingTop: "2.5mm",
                                        paddingBottom: "2.5mm",
                                        borderTop: "1px dashed #000",
                                    }}
                                >
                                    <div style={{ fontSize: "11px", fontWeight: 800, marginBottom: "1.2mm", textTransform: "uppercase", letterSpacing: "0.3px" }}>
                                        Terima Kasih!
                                    </div>
                                    <div style={{ fontSize: "9px", fontWeight: 600, letterSpacing: "0.2px" }}>kedaiyuru.click</div>
                                </div>
                                <div style={{ height: "12mm" }} />
                            </div>
                        </div>
                    </div>

                    <style>{`
            @keyframes spin { to { transform: rotate(360deg); } }
          `}</style>
                </div>
            </div>

            {/* Mobile PDF Modal */}
            {showPdfModal && (
                <div
                    style={{
                        position: "fixed",
                        inset: 0,
                        backgroundColor: "rgba(0, 0, 0, 0.85)",
                        zIndex: 9999,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        padding: "16px",
                    }}
                    onClick={() => setShowPdfModal(false)}
                >
                    <div
                        style={{
                            backgroundColor: "#ffffff",
                            borderRadius: "12px",
                            width: "100%",
                            maxWidth: "900px",
                            height: "90vh",
                            display: "flex",
                            flexDirection: "column",
                            overflow: "hidden",
                            boxShadow: "0 20px 60px rgba(0, 0, 0, 0.5)",
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div
                            style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                padding: "16px 20px",
                                borderBottom: "1px solid #e5e7eb",
                                backgroundColor: "#f9fafb",
                            }}
                        >
                            <h3 style={{ margin: 0, fontSize: "18px", fontWeight: 800, color: "#111827" }}>
                                📄 Preview PDF Receipt
                            </h3>

                            <div style={{ display: "flex", gap: "8px" }}>
                                <button
                                    onClick={downloadPDF}
                                    style={{
                                        padding: "8px 16px",
                                        backgroundColor: "#3b82f6",
                                        color: "#ffffff",
                                        border: "none",
                                        borderRadius: "6px",
                                        fontSize: "14px",
                                        fontWeight: 700,
                                        cursor: "pointer",
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "6px",
                                    }}
                                >
                                    <span>📥</span>
                                    <span style={{ display: isSmall ? "none" : "inline" }}>Download</span>
                                </button>

                                <button
                                    onClick={() => setShowPdfModal(false)}
                                    style={{
                                        padding: "8px 16px",
                                        backgroundColor: "#6b7280",
                                        color: "#ffffff",
                                        border: "none",
                                        borderRadius: "6px",
                                        fontSize: "14px",
                                        fontWeight: 700,
                                        cursor: "pointer",
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "6px",
                                    }}
                                >
                                    <span>✕</span>
                                    <span style={{ display: isSmall ? "none" : "inline" }}>Tutup</span>
                                </button>
                            </div>
                        </div>

                        <div style={{ flex: 1, overflow: "hidden", position: "relative" }}>
                            {(pdfUrl || backendPdfUrl) ? (
                                <iframe
                                    src={pdfUrl || backendPdfUrl}
                                    style={{ width: "100%", height: "100%", border: "none" }}
                                    title="PDF Preview"
                                />
                            ) : (
                                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "#6b7280" }}>
                                    <div style={{ textAlign: "center" }}>
                                        <div style={{ fontSize: "48px", marginBottom: "16px" }}>📄</div>
                                        <p>PDF tidak tersedia</p>
                                    </div>
                                </div>
                            )}
                        </div>

                        {isMobile && (
                            <div
                                style={{
                                    padding: "12px 20px",
                                    backgroundColor: "#fef3c7",
                                    borderTop: "1px solid #fde68a",
                                    fontSize: "12px",
                                    color: "#92400e",
                                    textAlign: "center",
                                }}
                            >
                                💡 Gunakan pinch-to-zoom untuk memperbesar PDF
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default Receipt;
