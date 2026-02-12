import React, { useEffect, useState, useCallback, useRef } from "react";
import { Link } from "react-router-dom";
import AdminLayout from "../components/admin/AdminLayout";
import { staffAPI } from "../services/api";
import { notify } from '../components/common/Toast';
import ConfirmDialog from '../components/common/ConfirmDialog';

const MAX_AUTO_REFRESH_DURATION = 5 * 60 * 1000; // 5 minutes max

const WhatsAppSettings = () => {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [checkingDevice, setCheckingDevice] = useState(false);
    const [sendingTest, setSendingTest] = useState(false);
    const [showToken, setShowToken] = useState(false);
    const [restarting, setRestarting] = useState(false);
    const [loggingOut, setLoggingOut] = useState(false);
    const [logoutDialog, setLogoutDialog] = useState({ isOpen: false });
    const [isAutoRefreshActive, setIsAutoRefreshActive] = useState(false);

    const [settings, setSettings] = useState({
        wa_notifications_enabled: false,
        fonnte_token: "",
        whatsapp_provider: "self-hosted",
        updated_at: null,
    });

    const [deviceStatus, setDeviceStatus] = useState({
        isReady: false,
        qrCode: null,
        needsAuth: true,
        lastConnected: null,
        provider: 'self-hosted',
        messageStats: null
    });
    const [messageStats, setMessageStats] = useState(null);
    const [loadingStats, setLoadingStats] = useState(false);
    const autoRefreshRef = useRef(null);
    const [testTarget, setTestTarget] = useState("");
    const [testMessage, setTestMessage] = useState("Tes notifikasi WhatsApp dari Kedai Yuru ✅");
    const previousReadyState = useRef(false);
    const refreshIntervalRef = useRef(5000); // Start with 5 seconds
    const autoRefreshStartTime = useRef(null);
    const isCheckingInProgress = useRef(false);

    const checkDevice = useCallback(async (showNotification = false) => {
        // Prevent overlapping requests
        if (isCheckingInProgress.current) {
            console.log('[WA Settings] Check already in progress, skipping...');
            return;
        }
        
        isCheckingInProgress.current = true;
        setCheckingDevice(true);
        try {
            const res = await staffAPI.getWhatsAppDevice();
            const data = res?.data?.data || res?.data || {};
            
            const newIsReady = data.isReady || false;
            const wasNotReadyBefore = !previousReadyState.current;
            
            setDeviceStatus({
                isReady: newIsReady,
                qrCode: data.qrCode || null,
                needsAuth: data.needsAuth || false,
                lastConnected: data.lastConnected || null,
                provider: data.provider || 'self-hosted',
                retryCount: data.retryCount || 0,
                queueSize: data.queueSize || 0
            });
            
            // Show notification when status changes from not ready to ready (during auto-refresh)
            if (newIsReady && wasNotReadyBefore && autoRefreshRef.current) {
                notify.success("WhatsApp berhasil terhubung! ✅");
            }
            
            // Show notification if explicitly requested (after manual action)
            if (newIsReady && showNotification) {
                notify.success("WhatsApp berhasil terhubung! ✅");
            }
            
            // Update previous state
            previousReadyState.current = newIsReady;
            
        } catch (e) {
            console.error(e);
            // Don't spam error notifications during auto-refresh
            if (!autoRefreshRef.current && showNotification) {
                notify.error("Gagal cek status WhatsApp");
            }
        } finally {
            setCheckingDevice(false);
            isCheckingInProgress.current = false;
        }
    }, []);

    const fetchSettings = useCallback(async () => {
        setLoading(true);
        try {
            const res = await staffAPI.getStoreSettings();
            const s = res?.data?.settings || {};
            setSettings((prev) => ({
                ...prev,
                wa_notifications_enabled: Boolean(s.wa_notifications_enabled),
                fonnte_token: s.fonnte_token || "",
                updated_at: s.updated_at || null,
            }));
        } catch (e) {
            console.error(e);
            notify.error("Gagal memuat pengaturan WhatsApp");
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchMessageStats = useCallback(async () => {
        if (deviceStatus.provider === 'fonnte') return; // Not available for Fonnte
        
        setLoadingStats(true);
        try {
            const res = await staffAPI.getWhatsAppMessageStats();
            if (res?.data?.success) {
                setMessageStats(res.data.data);
            }
        } catch (e) {
            console.error('Failed to fetch message stats:', e);
            // Silent fail - stats are not critical
        } finally {
            setLoadingStats(false);
        }
    }, [deviceStatus.provider]);

    useEffect(() => {
        fetchSettings();
        fetchMessageStats(); // Initial fetch
    }, [fetchSettings, fetchMessageStats]);

    useEffect(() => {
        checkDevice();
    }, [checkDevice]);

    // Fetch message stats when device becomes ready
    useEffect(() => {
        if (deviceStatus.isReady && deviceStatus.provider === 'self-hosted') {
            fetchMessageStats();
        }
    }, [deviceStatus.isReady, deviceStatus.provider, fetchMessageStats]);

    // Auto-refresh with exponential backoff and max duration
    useEffect(() => {
        if (!deviceStatus.isReady && deviceStatus.provider === 'self-hosted') {
            if (!autoRefreshRef.current) {
                console.log('[WA Settings] Starting smart auto-refresh (exponential backoff)...');
                setIsAutoRefreshActive(true);
                autoRefreshStartTime.current = Date.now();
                refreshIntervalRef.current = 5000; // Reset to 5 seconds
                
                const scheduleNextCheck = () => {
                    // Check if max duration exceeded
                    const elapsed = Date.now() - autoRefreshStartTime.current;
                    if (elapsed > MAX_AUTO_REFRESH_DURATION) {
                        console.log('[WA Settings] Auto-refresh timeout (5 min) - stopping. Click Refresh to check manually.');
                        if (autoRefreshRef.current) {
                            clearTimeout(autoRefreshRef.current);
                            autoRefreshRef.current = null;
                        }
                        setIsAutoRefreshActive(false);
                        notify.info("Auto-refresh berhenti setelah 5 menit. Klik 'Refresh Status' untuk cek manual.");
                        return;
                    }
                    
                    autoRefreshRef.current = setTimeout(async () => {
                        await checkDevice(false);
                        
                        // Exponential backoff: increase interval gradually
                        // 5s -> 8s -> 12s -> 18s -> 25s -> max 30s
                        refreshIntervalRef.current = Math.min(
                            Math.floor(refreshIntervalRef.current * 1.5),
                            30000
                        );
                        
                        console.log(`[WA Settings] Next check in ${refreshIntervalRef.current/1000}s`);
                        scheduleNextCheck();
                    }, refreshIntervalRef.current);
                };
                
                scheduleNextCheck();
            }
        } else {
            if (autoRefreshRef.current) {
                console.log('[WA Settings] Stopping auto-refresh - device now ready');
                clearTimeout(autoRefreshRef.current);
                autoRefreshRef.current = null;
                autoRefreshStartTime.current = null;
                refreshIntervalRef.current = 5000; // Reset for next time
                setIsAutoRefreshActive(false);
            }
        }
        
        return () => {
            if (autoRefreshRef.current) {
                clearTimeout(autoRefreshRef.current);
                autoRefreshRef.current = null;
                setIsAutoRefreshActive(false);
            }
        };
    }, [deviceStatus.isReady, deviceStatus.provider, checkDevice]);

    const updateSetting = async (key, value) => {
        setSaving(true);
        try {
            const res = await staffAPI.updateStoreSetting(key, value);
            if (res.data.setting) {
                setSettings((prev) => ({
                    ...prev,
                    [res.data.setting.setting_key]: res.data.setting.setting_value,
                    updated_at: res.data.setting.updated_at,
                }));
            }
            notify.success("Pengaturan berhasil diperbarui");
        } catch (e) {
            console.error(e);
            notify.error("Gagal memperbarui pengaturan");
        } finally {
            setSaving(false);
        }
    };

    const reconnectDevice = async () => {
        if (deviceStatus.provider === 'fonnte') {
            notify.error("Restart tidak didukung untuk provider Fonnte");
            return;
        }

        setRestarting(true);
        try {
            // Reset auto-refresh settings
            refreshIntervalRef.current = 5000;
            previousReadyState.current = false;
            
            setDeviceStatus({ 
                ...deviceStatus, 
                isReady: false, 
                qrCode: null, 
                needsAuth: true 
            });
            
            await staffAPI.reconnectWhatsApp();
            notify.info("Memulai ulang WhatsApp service...");
            
            // Auto-check dalam 3 detik, auto-refresh will start automatically
            setTimeout(() => checkDevice(false), 3000);
        } catch (e) {
            console.error(e);
            notify.error("Gagal restart WhatsApp service");
        } finally {
            setRestarting(false);
        }
    };

    const openLogoutDialog = () => {
        if (deviceStatus.provider === 'fonnte') {
            notify.error("Logout tidak didukung untuk provider Fonnte");
            return;
        }
        setLogoutDialog({ isOpen: true });
    };

    const closeLogoutDialog = () => {
        setLogoutDialog({ isOpen: false });
    };

    const logoutDevice = async () => {
        setLoggingOut(true);
        try {
            await staffAPI.logoutWhatsApp();
            notify.success("🚪 Berhasil logout dari WhatsApp");
            
            // Reset auto-refresh settings to initial state
            refreshIntervalRef.current = 5000;
            previousReadyState.current = false;
            autoRefreshStartTime.current = null;
            
            // Reset device status immediately
            setDeviceStatus({ 
                isReady: false, 
                qrCode: null, 
                needsAuth: true,
                lastConnected: null,
                provider: 'self-hosted',
                retryCount: 0,
                queueSize: 0
            });
            
            // Start checking for new QR code after backend reinitializes (5 seconds)
            console.log('[WA Settings] Waiting for backend to generate new QR code...');
            setTimeout(() => {
                checkDevice(false);
                // Auto-refresh will start automatically via useEffect with fresh interval
            }, 5000);
        } catch (e) {
            console.error(e);
            notify.error("Gagal logout dari WhatsApp");
        } finally {
            setLoggingOut(false);
            closeLogoutDialog();
        }
    };

    const sendTest = async () => {
        if (!testTarget) {
            notify.error("Nomor tujuan test wajib diisi");
            return;
        }
        setSendingTest(true);
        try {
            await staffAPI.sendWhatsAppMessage({ target: testTarget, message: testMessage });
            notify.success("Pesan test dikirim (cek WhatsApp)");
        } catch (e) {
            console.error(e);
            notify.error("Gagal kirim pesan test");
        } finally {
            setSendingTest(false);
        }
    };

    if (loading) {
        return (
            <AdminLayout>
                <div className="flex items-center justify-center h-64">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
                </div>
            </AdminLayout>
        );
    }

    return (
        <AdminLayout>
            <div className="max-w-4xl mx-auto">
                <div className="mb-6">
                    <h1 className="text-3xl font-bold text-gray-900">Pengaturan WhatsApp</h1>
                    <p className="text-gray-600 mt-2">Kelola token Fonnte dan toggle notifikasi order via WhatsApp</p>
                    <div className="mt-3">
                        <Link to="/admin/store-settings" className="text-primary-600 hover:underline text-sm">
                            ← Kembali ke Pengaturan Toko
                        </Link>
                    </div>
                </div>

                <div className="space-y-6">
                    {/* Status & QR Code Card */}
                    <div className="bg-white rounded-lg shadow-md overflow-hidden">
                        <div className="p-6">
                            <h2 className="text-xl font-bold text-gray-900 mb-4">Status WhatsApp Bot</h2>
                            
                            {/* Provider Badge */}
                            <div className="flex items-center gap-3 mb-4 flex-wrap">
                                <span className="px-3 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                                    {deviceStatus.provider === 'fonnte' ? '🌐 Fonnte API' : '🖥️ Self-Hosted'}
                                </span>
                                {deviceStatus.provider === 'self-hosted' && deviceStatus.queueSize > 0 && (
                                    <span className="px-2 py-1 text-xs rounded-full bg-yellow-100 text-yellow-800">
                                        {deviceStatus.queueSize} antrian
                                    </span>
                                )}
                                {/* Auto-refresh indicator */}
                                {isAutoRefreshActive && !deviceStatus.isReady && deviceStatus.provider === 'self-hosted' && (
                                    <span className="px-2 py-1 text-xs rounded-full bg-purple-100 text-purple-700 animate-pulse">
                                        🔄 Auto-refresh aktif
                                    </span>
                                )}
                            </div>
                            
                            {/* Status Indicator */}
                            <div className="flex items-center gap-3 mb-4">
                                <div className={`w-4 h-4 rounded-full ${
                                    deviceStatus.isReady 
                                        ? 'bg-green-500 animate-pulse' 
                                        : 'bg-red-500'
                                }`}></div>
                                <span className={`font-semibold ${
                                    deviceStatus.isReady ? 'text-green-600' : 'text-red-600'
                                }`}>
                                    {deviceStatus.isReady 
                                        ? '🟢 Terhubung & Siap' 
                                        : deviceStatus.provider === 'fonnte' 
                                            ? 'Token Perlu Dikonfigurasi'
                                            : 'Tidak Terhubung'
                                    }
                                </span>
                            </div>

                            {/* Last Connected Info */}
                            {deviceStatus.lastConnected && (
                                <p className="text-sm text-gray-500 mb-4">
                                    Terakhir terhubung: {new Date(deviceStatus.lastConnected).toLocaleString('id-ID')}
                                </p>
                            )}

                            {/* QR Code Display - Only for self-hosted */}
                            {deviceStatus.provider === 'self-hosted' && deviceStatus.qrCode && !deviceStatus.isReady && (
                                <div className="text-center">
                                    <p className="text-gray-700 mb-4">
                                        📱 <strong>Scan QR code berikut dengan WhatsApp Anda:</strong>
                                    </p>
                                    <div className="inline-block p-4 bg-white border-2 border-gray-300 rounded-lg shadow-lg">
                                        <img 
                                            src={deviceStatus.qrCode} 
                                            alt="WhatsApp QR Code" 
                                            className="w-64 h-64 mx-auto"
                                        />
                                    </div>
                                    <div className="mt-4 text-sm text-gray-600 space-y-1">
                                        <p>1. Buka WhatsApp di HP Anda</p>
                                        <p>2. Tap Menu (⋮) → Linked Devices</p>
                                        <p>3. Tap "Link a Device" dan scan QR ini</p>
                                        <p className="font-semibold text-blue-600 mt-2">4. Beri nama perangkat (contoh: "Kedai Yuru POS") saat diminta</p>
                                    </div>
                                    <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-left">
                                        <p className="text-xs text-blue-800">
                                            💡 <strong>Tips:</strong> WhatsApp akan meminta Anda memberi nama perangkat setelah scan. 
                                            Ini normal dan hanya terjadi sekali. Nama ini untuk identifikasi perangkat Anda di WhatsApp.
                                        </p>
                                    </div>
                                    <div className="mt-3 p-3 bg-purple-50 border border-purple-200 rounded-lg text-left">
                                        <p className="text-xs text-purple-800">
                                            🔄 <strong>Auto-refresh:</strong> Status akan otomatis diperbarui setelah scan berhasil. 
                                            Interval pengecekan akan meningkat bertahap (5s→8s→12s→max 30s) untuk menghindari spam request. 
                                            Auto-refresh akan berhenti otomatis setelah 5 menit atau saat terhubung.
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* No QR but not ready - loading (self-hosted only) */}
                            {deviceStatus.provider === 'self-hosted' && !deviceStatus.qrCode && !deviceStatus.isReady && (
                                <div className="text-center">
                                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
                                    <p className="text-gray-600">Menyiapkan WhatsApp service...</p>
                                    {deviceStatus.retryCount > 0 && (
                                        <p className="text-orange-600 text-sm mt-2">
                                            Percobaan reconnect: {deviceStatus.retryCount}/3
                                        </p>
                                    )}
                                    <p className="text-xs text-gray-500 mt-3">
                                        💡 Auto-refresh aktif dengan smart interval (max 5 menit)
                                    </p>
                                </div>
                            )}

                            {/* Fonnte Status */}
                            {deviceStatus.provider === 'fonnte' && (
                                <div className="text-center">
                                    <div className="text-4xl mb-3">🌐</div>
                                    <p className="text-gray-600">
                                        {deviceStatus.isReady 
                                            ? "Fonnte API siap digunakan ✅" 
                                            : "Token Fonnte perlu dikonfigurasi di bawah ⬇️"}
                                    </p>
                                </div>
                            )}

                            {/* Action Buttons */}
                            <div className="flex gap-3 mt-6 flex-wrap">
                                <button
                                    onClick={() => checkDevice(true)}
                                    disabled={checkingDevice}
                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {checkingDevice ? (
                                        <span className="flex items-center gap-2">
                                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                            Checking...
                                        </span>
                                    ) : (
                                        "🔄 Refresh Status"
                                    )}
                                </button>

                                {deviceStatus.provider === 'self-hosted' && (
                                    <>
                                        <button
                                            onClick={reconnectDevice}
                                            disabled={restarting}
                                            className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            {restarting ? (
                                                <span className="flex items-center gap-2">
                                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                                    Restarting...
                                                </span>
                                            ) : (
                                                "🔌 Restart Service"
                                            )}
                                        </button>

                                        {deviceStatus.isReady && (
                                            <button
                                                onClick={openLogoutDialog}
                                                disabled={loggingOut}
                                                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                {loggingOut ? (
                                                    <span className="flex items-center gap-2">
                                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                                        Logging out...
                                                    </span>
                                                ) : (
                                                    "🚪 Logout WhatsApp"
                                                )}
                                            </button>
                                        )}
                                    </>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Message Usage Statistics (Anti-Ban Monitoring) */}
                    {deviceStatus.provider === 'self-hosted' && deviceStatus.isReady && (
                        <div className="bg-white rounded-lg shadow-md overflow-hidden">
                            <div className="p-6">
                                <div className="flex items-center justify-between mb-4">
                                    <h2 className="text-xl font-bold text-gray-900">📊 Message Usage Statistics</h2>
                                    <button
                                        onClick={fetchMessageStats}
                                        disabled={loadingStats}
                                        className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                                    >
                                        {loadingStats ? "Loading..." : "🔄 Refresh"}
                                    </button>
                                </div>

                                {messageStats ? (
                                    <div className="space-y-6">
                                        {/* Risk Level Badge */}
                                        <div className="flex items-center gap-3">
                                            <span className="text-sm font-semibold text-gray-700">Risk Level:</span>
                                            <span className={`px-3 py-1 text-sm font-bold rounded-full ${
                                                messageStats.riskLevel.color === 'green' ? 'bg-green-100 text-green-800' :
                                                messageStats.riskLevel.color === 'blue' ? 'bg-blue-100 text-blue-800' :
                                                messageStats.riskLevel.color === 'yellow' ? 'bg-yellow-100 text-yellow-800' :
                                                messageStats.riskLevel.color === 'orange' ? 'bg-orange-100 text-orange-800' :
                                                'bg-red-100 text-red-800 animate-pulse'
                                            }`}>
                                                {messageStats.riskLevel.text}
                                            </span>
                                        </div>

                                        {/* Hourly Stats */}
                                        <div>
                                            <div className="flex justify-between items-center mb-2">
                                                <span className="text-sm font-semibold text-gray-700">Hourly Usage</span>
                                                <span className="text-sm text-gray-600">
                                                    {messageStats.hourly.sent}/{messageStats.hourly.max} pesan 
                                                    ({messageStats.hourly.remaining} tersisa)
                                                </span>
                                            </div>
                                            <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
                                                <div 
                                                    className={`h-4 rounded-full transition-all ${
                                                        messageStats.hourly.percentage < 50 ? 'bg-green-500' :
                                                        messageStats.hourly.percentage < 75 ? 'bg-yellow-500' :
                                                        messageStats.hourly.percentage < 90 ? 'bg-orange-500' :
                                                        'bg-red-500'
                                                    }`}
                                                    style={{ width: `${messageStats.hourly.percentage}%` }}
                                                ></div>
                                            </div>
                                            <p className="text-xs text-gray-500 mt-1">
                                                Reset dalam {messageStats.hourly.resetIn} menit ({messageStats.hourly.resetAt})
                                            </p>
                                        </div>

                                        {/* Daily Stats */}
                                        <div>
                                            <div className="flex justify-between items-center mb-2">
                                                <span className="text-sm font-semibold text-gray-700">Daily Usage</span>
                                                <span className="text-sm text-gray-600">
                                                    {messageStats.daily.sent}/{messageStats.daily.max} pesan 
                                                    ({messageStats.daily.remaining} tersisa)
                                                </span>
                                            </div>
                                            <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
                                                <div 
                                                    className={`h-4 rounded-full transition-all ${
                                                        messageStats.daily.percentage < 25 ? 'bg-green-500' :
                                                        messageStats.daily.percentage < 50 ? 'bg-blue-500' :
                                                        messageStats.daily.percentage < 75 ? 'bg-yellow-500' :
                                                        messageStats.daily.percentage < 90 ? 'bg-orange-500' :
                                                        'bg-red-500 animate-pulse'
                                                    }`}
                                                    style={{ width: `${messageStats.daily.percentage}%` }}
                                                ></div>
                                            </div>
                                            <p className="text-xs text-gray-500 mt-1">
                                                Reset dalam {messageStats.daily.resetIn} jam ({messageStats.daily.resetAt})
                                            </p>
                                        </div>

                                        {/* Queue Info */}
                                        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-200">
                                            <div>
                                                <p className="text-xs text-gray-500">Queue</p>
                                                <p className="text-lg font-bold text-gray-900">
                                                    {messageStats.queue.pending} pending
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-gray-500">Consecutive</p>
                                                <p className="text-lg font-bold text-gray-900">
                                                    {messageStats.consecutiveMessages}/5
                                                </p>
                                            </div>
                                            <div className="col-span-2">
                                                <p className="text-xs text-gray-500">Last Message Sent</p>
                                                <p className="text-sm font-semibold text-gray-900">
                                                    {messageStats.lastMessageTime}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Warning Messages */}
                                        {messageStats.daily.percentage >= 90 && (
                                            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                                                <p className="text-sm text-red-800 font-semibold">
                                                    🚨 CRITICAL: Mendekati limit harian! Risk ban tinggi!
                                                </p>
                                                <p className="text-xs text-red-700 mt-1">
                                                    Hentikan pengiriman pesan non-esensial untuk menghindari WhatsApp ban.
                                                </p>
                                            </div>
                                        )}

                                        {messageStats.daily.percentage >= 75 && messageStats.daily.percentage < 90 && (
                                            <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
                                                <p className="text-sm text-orange-800 font-semibold">
                                                    ⚠️ WARNING: Moderate-high usage detected
                                                </p>
                                                <p className="text-xs text-orange-700 mt-1">
                                                    Prioritaskan hanya pesan penting (payment, order ready, delivery).
                                                </p>
                                            </div>
                                        )}

                                        {/* Info Box */}
                                        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                            <p className="text-xs text-blue-800">
                                                💡 <strong>Tips Anti-Ban:</strong> Bot secara otomatis menerapkan delay 20-45 detik 
                                                antar pesan dan break otomatis setiap 5 pesan berturut-turut untuk menghindari deteksi spam WhatsApp.
                                            </p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-center py-8">
                                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-3"></div>
                                        <p className="text-gray-500 text-sm">Loading statistics...</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Toggle Notifications */}
                    <div className="bg-white rounded-lg shadow-md overflow-hidden">
                        <div className="p-6">
                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <h2 className="text-xl font-bold text-gray-900">Notifikasi WhatsApp</h2>
                                    <p className="text-gray-600 mt-2">
                                        {settings.wa_notifications_enabled
                                            ? "✅ Notifikasi AKTIF. Sistem akan mengirim pesan ke customer sesuai status order."
                                            : "⚠️ Notifikasi NONAKTIF. Sistem tidak akan mengirim pesan ke customer."}
                                    </p>
                                    <p className="text-xs text-gray-500 mt-2">
                                        Provider: <strong>{deviceStatus.provider}</strong> | 
                                        Status: <strong>{deviceStatus.isReady ? 'Siap' : 'Belum Siap'}</strong>
                                    </p>
                                </div>

                                <div className="shrink-0">
                                    <button
                                        onClick={() => updateSetting("wa_notifications_enabled", !settings.wa_notifications_enabled)}
                                        disabled={saving}
                                        className={`relative inline-flex h-10 w-20 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 ${
                                            settings.wa_notifications_enabled ? "bg-green-600" : "bg-gray-300"
                                        } ${saving ? "opacity-50 cursor-not-allowed" : ""}`}
                                    >
                                        <span
                                            className={`inline-block h-8 w-8 transform rounded-full bg-white shadow-lg transition-transform ${
                                                settings.wa_notifications_enabled ? "translate-x-11" : "translate-x-1"
                                            }`}
                                        />
                                    </button>
                                    <p
                                        className={`text-xs font-semibold mt-2 text-center ${
                                            settings.wa_notifications_enabled ? "text-green-600" : "text-red-600"
                                        }`}
                                    >
                                        {settings.wa_notifications_enabled ? "AKTIF" : "NONAKTIF"}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Fonnte Token Card - Only show for fonnte provider */}
                    {deviceStatus.provider === 'fonnte' && (

                    <div className="bg-white rounded-lg shadow-md overflow-hidden">
                        <div className="p-6">
                            <div className="flex items-center gap-3 mb-4">
                                <h2 className="text-xl font-bold text-gray-900">Token Fonnte</h2>
                                <span className="px-2 py-1 text-xs rounded-full bg-orange-100 text-orange-800">
                                    Legacy Provider
                                </span>
                            </div>
                            <p className="text-gray-600 mb-4">Token ini digunakan untuk mengirim pesan via API Fonnte.</p>

                            <div className="mt-4">
                                <label className="block text-sm font-medium text-gray-700 mb-2">FONNTE_TOKEN</label>
                                <div className="relative">
                                    <input
                                        type={showToken ? "text" : "password"}
                                        value={settings.fonnte_token}
                                        onChange={(e) => setSettings((prev) => ({ ...prev, fonnte_token: e.target.value }))}
                                        placeholder="Masukkan token Fonnte..."
                                        className="w-full rounded-lg border border-gray-300 px-3 py-2 pr-10 focus:outline-none focus:ring-2 focus:ring-primary-500"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowToken(!showToken)}
                                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-500 hover:text-gray-700 focus:outline-none"
                                        title={showToken ? "Sembunyikan token" : "Tampilkan token"}
                                    >
                                        {showToken ? (
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                                            </svg>
                                        ) : (
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                            </svg>
                                        )}
                                    </button>
                                </div>
                                <div className="flex gap-3 mt-4 flex-wrap">
                                    <button
                                        onClick={() => updateSetting("fonnte_token", settings.fonnte_token)}
                                        disabled={saving}
                                        className="px-4 py-2 rounded-lg bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50"
                                    >
                                        Simpan Token
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                    )}

                    {/* Test Message Card */}
                    <div className="bg-white rounded-lg shadow-md overflow-hidden">
                        <div className="p-6">
                            <h2 className="text-xl font-bold text-gray-900 mb-2">Test Kirim Pesan</h2>
                            <p className="text-gray-600 mb-4">
                                {deviceStatus.provider === 'fonnte' 
                                    ? "Pastikan token Fonnte sudah benar sebelum test."
                                    : "Pastikan WhatsApp sudah terhubung sebelum test."
                                }
                            </p>
                            
                            {/* Connection Status Warning */}
                            {!deviceStatus.isReady && (
                                <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                                    <div className="flex items-center gap-2">
                                        <svg className="w-5 h-5 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                        </svg>
                                        <span className="text-sm text-yellow-800 font-medium">
                                            {deviceStatus.provider === 'fonnte' 
                                                ? "Token belum dikonfigurasi atau tidak valid"
                                                : "WhatsApp belum terhubung. Scan QR code terlebih dahulu."
                                            }
                                        </span>
                                    </div>
                                </div>
                            )}

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Nomor Tujuan</label>
                                    <input
                                        type="text"
                                        value={testTarget}
                                        onChange={(e) => setTestTarget(e.target.value)}
                                        placeholder="Contoh: 08123456789"
                                        className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                                    />
                                    <p className="text-xs text-gray-500 mt-2">Boleh pakai format 08xxx / +62 / 62xxx (akan diformat otomatis)</p>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Pesan</label>
                                    <input
                                        type="text"
                                        value={testMessage}
                                        onChange={(e) => setTestMessage(e.target.value)}
                                        className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                                    />
                                </div>
                            </div>

                            <div className="mt-4">
                                <button
                                    onClick={sendTest}
                                    disabled={sendingTest || !deviceStatus.isReady || !testTarget.trim()}
                                    className="px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {sendingTest ? (
                                        <span className="flex items-center gap-2">
                                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                            Mengirim...
                                        </span>
                                    ) : (
                                        "📱 Kirim Pesan Test"
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>

                    {settings.updated_at && (
                        <div className="bg-gray-50 rounded-lg p-4">
                            <p className="text-sm text-gray-600">
                                <span className="font-medium">Terakhir diperbarui:</span>{" "}
                                {new Date(settings.updated_at).toLocaleString("id-ID", {
                                    weekday: "long",
                                    year: "numeric",
                                    month: "long",
                                    day: "numeric",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                })}
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* Confirm Dialog untuk Logout */}
            <ConfirmDialog
                isOpen={logoutDialog.isOpen}
                onClose={closeLogoutDialog}
                onConfirm={logoutDevice}
                title="Logout dari WhatsApp?"
                message="Yakin ingin logout dari WhatsApp? Anda perlu scan QR code lagi untuk reconnect."
                confirmText="Ya, Logout"
                cancelText="Batal"
                type="warning"
            />
        </AdminLayout>
    );
};

export default WhatsAppSettings;
