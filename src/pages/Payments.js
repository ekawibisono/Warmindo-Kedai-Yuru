import React, { useEffect, useMemo, useState } from "react";
import AdminLayout from "../components/admin/AdminLayout";
import { staffAPI } from "../services/api";
import ConfirmDialog from "../components/common/ConfirmDialog";
import notify from "../components/common/Toast";

const getNormalizedProofUrl = (payment) => {
  const origin = window.location.origin;
  const apiFilesBase = `${origin}/api/files`;

  const proofUrl = payment?.proof_url;
  const proofKey = payment?.proof_key;

  // absolute URL
  if (typeof proofUrl === "string" && /^https?:\/\//i.test(proofUrl)) {
    return proofUrl;
  }

  // relative /api/files/...
  if (typeof proofUrl === "string" && proofUrl.startsWith("/api/files/")) {
    const file = proofUrl.split("/").pop();
    return `${apiFilesBase}/${encodeURIComponent(file)}`;
  }

  // relative /files/...
  if (typeof proofUrl === "string" && proofUrl.startsWith("/files/")) {
    const file = proofUrl.split("/").pop();
    return `${apiFilesBase}/${encodeURIComponent(file)}`;
  }

  // filename only
  if (typeof proofKey === "string" && proofKey.trim() !== "") {
    return `${apiFilesBase}/${encodeURIComponent(proofKey)}`;
  }

  return null;
};

const isPdfUrl = (url) => (url || "").toLowerCase().endsWith(".pdf");

const Payments = () => {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  const [selectedProof, setSelectedProof] = useState(null);
  const [proofError, setProofError] = useState(null);

  // Confirm dialog state
  const [verifyDialog, setVerifyDialog] = useState({
    isOpen: false,
    id: null,
    orderNo: "",
    status: "",
  });

  const formatRupiah = useMemo(() => {
    return (number) =>
      new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        minimumFractionDigits: 0,
      }).format(Number(number || 0));
  }, []);

  const fetchPendingPayments = async () => {
    setLoading(true);
    try {
      const response = await staffAPI.getPendingPayments();
      const rows = response?.data?.payments || [];
      setPayments(rows);
    } catch (error) {
      console.error("Error fetching pending payments:", error);
      notify.error("Gagal memuat data pembayaran");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingPayments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openVerifyDialog = (payment, status) => {
    setVerifyDialog({
      isOpen: true,
      id: payment.id,
      orderNo: payment.order_no || "-",
      status,
    });
  };

  const closeVerifyDialog = () => {
    setVerifyDialog({ isOpen: false, id: null, orderNo: "", status: "" });
  };

  const handleVerify = async () => {
    try {
      await staffAPI.verifyPayment(verifyDialog.id, verifyDialog.status);
      notify.success(
        `Pembayaran ${verifyDialog.orderNo} berhasil ${
          verifyDialog.status === "verified" ? "diverifikasi" : "ditolak"
        }`
      );
      closeVerifyDialog();
      fetchPendingPayments();
    } catch (error) {
      console.error("Error verifying payment:", error);
      notify.error(error.response?.data?.message || "Gagal memverifikasi pembayaran");
    }
  };

  const handleOpenProof = (payment) => {
    const url = getNormalizedProofUrl(payment);
    if (!url) {
      notify.error("Bukti transfer tidak tersedia");
      return;
    }
    setProofError(null);
    setSelectedProof(url);
  };

  const handleCloseProof = () => {
    setSelectedProof(null);
    setProofError(null);
  };

  return (
    <AdminLayout>
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600" />
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Verifikasi Pembayaran</h1>
              <p className="text-gray-600 mt-2">Review dan verifikasi pembayaran QRIS</p>
            </div>

            <button onClick={fetchPendingPayments} className="btn-secondary flex items-center">
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              Refresh
            </button>
          </div>

          {payments.length === 0 ? (
            <div className="card text-center py-12">
              <svg className="mx-auto h-16 w-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <p className="mt-4 text-lg text-gray-600">Tidak ada pembayaran yang menunggu verifikasi</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {payments.map((payment) => {
                const paidAt = payment.paid_at ? new Date(payment.paid_at) : null;
                const paidAtText = paidAt ? paidAt.toLocaleString("id-ID") : "-";
                const hasProof = Boolean(payment.proof_url || payment.proof_key);

                return (
                  <div key={payment.id} className="card">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-lg font-bold text-gray-900">{payment.order_no}</h3>
                        <p className="text-sm text-gray-500">{payment.customer_name}</p>
                        {payment.customer_phone && (
                          <p className="text-sm text-gray-500">{payment.customer_phone}</p>
                        )}
                      </div>
                      <span className="badge-warning">Pending</span>
                    </div>

                    <div className="space-y-3 mb-4">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Amount:</span>
                        <span className="font-medium">{formatRupiah(payment.amount)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Grand Total:</span>
                        <span className="font-medium">{formatRupiah(payment.grand_total)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Paid At:</span>
                        <span className="font-medium">{paidAtText}</span>
                      </div>
                    </div>

                    {hasProof && (
                      <div className="mb-4">
                        <button
                          onClick={() => handleOpenProof(payment)}
                          className="w-full btn-secondary text-sm py-2"
                        >
                          Lihat Bukti Transfer
                        </button>
                      </div>
                    )}

                    <div className="flex space-x-3">
                      <button
                        onClick={() => openVerifyDialog(payment, "rejected")}
                        className="flex-1 btn-danger text-sm py-2"
                      >
                        Tolak
                      </button>
                      <button
                        onClick={() => openVerifyDialog(payment, "verified")}
                        className="flex-1 btn-success text-sm py-2"
                      >
                        Verifikasi
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Proof Modal */}
      {selectedProof && (
        <div
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50"
          onClick={handleCloseProof}
        >
          <div className="relative max-w-4xl w-full" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={handleCloseProof}
              className="absolute -top-3 -right-3 bg-white text-black rounded-full w-8 h-8 flex items-center justify-center shadow-lg hover:bg-gray-200 transition z-10"
              aria-label="Close"
              title="Close"
            >
              ✕
            </button>

            {proofError ? (
              <div className="bg-white rounded-lg p-6 text-center">
                <p className="text-red-600 font-bold mb-2">Gagal memuat bukti transfer</p>
                <p className="text-sm text-gray-600 break-all">{selectedProof}</p>
              </div>
            ) : isPdfUrl(selectedProof) ? (
              <iframe
                src={selectedProof}
                title="Payment Proof PDF"
                className="w-full h-[80vh] rounded-lg bg-white"
              />
            ) : (
              <img
                src={selectedProof}
                alt="Payment Proof"
                className="w-full max-h-[80vh] object-contain rounded-lg bg-white"
                onError={() => setProofError(true)}
              />
            )}
          </div>
        </div>
      )}

      {/* Confirm Dialog */}
      <ConfirmDialog
        isOpen={verifyDialog.isOpen}
        onClose={closeVerifyDialog}
        onConfirm={handleVerify}
        title={verifyDialog.status === "verified" ? "Verifikasi Pembayaran?" : "Tolak Pembayaran?"}
        message={`Apakah Anda yakin ingin ${
          verifyDialog.status === "verified" ? "memverifikasi" : "menolak"
        } pembayaran untuk order ${verifyDialog.orderNo}?`}
        confirmText={verifyDialog.status === "verified" ? "Ya, Verifikasi" : "Ya, Tolak"}
        cancelText="Batal"
        type={verifyDialog.status === "verified" ? "success" : "danger"}
      />
    </AdminLayout>
  );
};

export default Payments;
