import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import AdminLayout from "../components/admin/AdminLayout";
import { staffAPI } from "../services/api";
import notify from "../components/common/Toast";

const WhatsAppSettings = () => {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [checkingDevice, setCheckingDevice] = useState(false);
    const [sendingTest, setSendingTest] = useState(false);
    const [showToken, setShowToken] = useState(false);

    const [settings, setSettings] = useState({
        wa_notifications_enabled: false,
        fonnte_token: "",
        updated_at: null,
    });

    const [deviceInfo, setDeviceInfo] = useState(null);
    const [testTarget, setTestTarget] = useState("");
    const [testMessage, setTestMessage] = useState("Tes notifikasi WhatsApp dari Kedai Yuru ✅");

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
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
    };

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

    const checkDevice = async () => {
        setCheckingDevice(true);
        try {
            const res = await staffAPI.getWhatsAppDevice();
            setDeviceInfo(res?.data?.data || res?.data || null);
            notify.success("Status device berhasil dicek");
        } catch (e) {
            console.error(e);
            notify.error("Gagal cek status device (pastikan token benar)");
        } finally {
            setCheckingDevice(false);
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
                    {/* Toggle */}
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
                                        Catatan: toggle ini disimpan di database (store_settings). Jika kosong, sistem masih bisa fallback ke ENV.
                                    </p>
                                </div>

                                <div className="shrink-0">
                                    <button
                                        onClick={() => updateSetting("wa_notifications_enabled", !settings.wa_notifications_enabled)}
                                        disabled={saving}
                                        className={`relative inline-flex h-10 w-20 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 ${settings.wa_notifications_enabled ? "bg-green-600" : "bg-gray-300"
                                            } ${saving ? "opacity-50 cursor-not-allowed" : ""}`}
                                    >
                                        <span
                                            className={`inline-block h-8 w-8 transform rounded-full bg-white shadow-lg transition-transform ${settings.wa_notifications_enabled ? "translate-x-11" : "translate-x-1"
                                                }`}
                                        />
                                    </button>
                                    <p
                                        className={`text-xs font-semibold mt-2 text-center ${settings.wa_notifications_enabled ? "text-green-600" : "text-red-600"
                                            }`}
                                    >
                                        {settings.wa_notifications_enabled ? "AKTIF" : "NONAKTIF"}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Token */}
                    <div className="bg-white rounded-lg shadow-md overflow-hidden">
                        <div className="p-6">
                            <h2 className="text-xl font-bold text-gray-900">Token Fonnte</h2>
                            <p className="text-gray-600 mt-2">Token ini digunakan untuk mengirim pesan via API Fonnte.</p>

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

                                    <button
                                        onClick={checkDevice}
                                        disabled={checkingDevice}
                                        className="px-4 py-2 rounded-lg bg-gray-800 text-white hover:bg-gray-900 disabled:opacity-50"
                                    >
                                        {checkingDevice ? "Mengecek..." : "Cek Status Device"}
                                    </button>
                                </div>
                            </div>

                            {deviceInfo && (
                                <div className="mt-4 bg-gray-50 rounded-lg p-4">
                                    <div className="text-sm font-semibold text-gray-800 mb-2">Device Response</div>
                                    <pre className="text-xs overflow-auto whitespace-pre-wrap">{JSON.stringify(deviceInfo, null, 2)}</pre>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Test */}
                    <div className="bg-white rounded-lg shadow-md overflow-hidden">
                        <div className="p-6">
                            <h2 className="text-xl font-bold text-gray-900">Test Kirim Pesan</h2>
                            <p className="text-gray-600 mt-2">Pastikan token sudah benar sebelum test.</p>

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
                                    disabled={sendingTest}
                                    className="px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
                                >
                                    {sendingTest ? "Mengirim..." : "Kirim Pesan Test"}
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
        </AdminLayout>
    );
};

export default WhatsAppSettings;
