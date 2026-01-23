import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import AdminLayout from '../components/admin/AdminLayout';
import { staffAPI } from '../services/api';
import notify from '../components/common/Toast';

const StoreSettings = () => {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [realTimeStatus, setRealTimeStatus] = useState(null);
    const [settings, setSettings] = useState({
        delivery_enabled: true,
        order_enabled: true,
        store_name: '',
        store_address: '',
        store_phone: '',
        // ✅ Jam operasional settings
        auto_schedule_enabled: false,
        opening_time: '09:00',
        closing_time: '21:30',
        timezone: 'Asia/Jakarta',
        updated_at: null
    });

    const [editMode, setEditMode] = useState({
        store_name: false,
        store_address: false,
        store_phone: false
    });

    const [tempValues, setTempValues] = useState({
        store_name: '',
        store_address: '',
        store_phone: ''
    });

    useEffect(() => {
        fetchSettings();
        
        // Set up real-time status checking every 30 seconds
        const statusInterval = setInterval(fetchRealTimeStatus, 30000);
        
        return () => clearInterval(statusInterval);
    }, []);

    const fetchRealTimeStatus = async () => {
        try {
            const response = await staffAPI.getStoreStatus();
            setRealTimeStatus(response.data);
        } catch (error) {
            console.error('Error fetching real-time status:', error);
        }
    };

    const fetchSettings = async () => {
        setLoading(true);
        try {
            const response = await staffAPI.getStoreSettings();
            // Merge with default settings to ensure all keys exist
            const fetchedSettings = {
                delivery_enabled: true,
                order_enabled: true,
                store_name: '',
                store_address: '',
                store_phone: '',
                // ✅ Default jam operasional
                auto_schedule_enabled: false,
                opening_time: '09:00',
                closing_time: '21:30',
                timezone: 'Asia/Jakarta',
                ...(response.data.settings || {})
            };
            setSettings(fetchedSettings);
            // Initialize temp values with current values
            setTempValues({
                store_name: fetchedSettings.store_name || '',
                store_address: fetchedSettings.store_address || '',
                store_phone: fetchedSettings.store_phone || ''
            });
            
            // Also fetch real-time status
            await fetchRealTimeStatus();
        } catch (error) {
            console.error('Error fetching settings:', error);
            notify.error('Gagal memuat pengaturan toko');
        } finally {
            setLoading(false);
        }
    };

    const updateSetting = async (key, value) => {
        setSaving(true);
        try {
            const response = await staffAPI.updateStoreSetting(key, value);
            // Backend returns { setting: {...} } for single setting update
            // We need to merge it with current settings
            if (response.data.setting) {
                setSettings(prev => ({
                    ...prev,
                    [response.data.setting.setting_key]: response.data.setting.setting_value,
                    updated_at: response.data.setting.updated_at
                }));
            } else if (response.data.settings) {
                setSettings(response.data.settings);
            }
            notify.success('Pengaturan berhasil diperbarui');
            
            // Refresh real-time status after setting update
            await fetchRealTimeStatus();
        } catch (error) {
            console.error('Error updating setting:', error);
            notify.error('Gagal memperbarui pengaturan');
        } finally {
            setSaving(false);
        }
    };

    const handleToggleDelivery = () => {
        const newValue = !settings.delivery_enabled;
        updateSetting('delivery_enabled', newValue);
    };

    const handleToggleOrder = () => {
        const newValue = !settings.order_enabled;
        updateSetting('order_enabled', newValue);
    };

    // ✅ Toggle auto schedule
    const handleToggleAutoSchedule = () => {
        const newValue = !settings.auto_schedule_enabled;
        updateSetting('auto_schedule_enabled', newValue);
    };

    // ✅ Update jam buka/tutup
    const handleTimeChange = (timeType, value) => {
        updateSetting(timeType, value);
    };

    // ✅ Helper untuk cek apakah toko buka berdasarkan jam
    const isStoreOpenBySchedule = () => {
        if (!settings.auto_schedule_enabled) return true;
        
        const now = new Date();
        const currentTime = now.toTimeString().slice(0, 5); // HH:MM format
        
        return currentTime >= settings.opening_time && currentTime <= settings.closing_time;
    };

    // ✅ Status toko berdasarkan manual + auto schedule (gunakan real-time status dari backend)
    const getStoreStatus = () => {
        // Gunakan real-time status dari backend jika tersedia
        if (realTimeStatus) {
            return {
                status: realTimeStatus.isOpen ? 'open' : 'closed',
                reason: realTimeStatus.reason,
                message: realTimeStatus.message
            };
        }
        
        // Fallback ke logic local (untuk backward compatibility)
        if (!settings.order_enabled) {
            return { status: 'closed', reason: 'manual', message: 'Toko ditutup secara manual' };
        }
        
        if (settings.auto_schedule_enabled && !isStoreOpenBySchedule()) {
            return { 
                status: 'closed', 
                reason: 'schedule', 
                message: `Toko tutup otomatis (${settings.closing_time} - ${settings.opening_time})` 
            };
        }
        
        return { status: 'open', reason: 'normal', message: 'Toko sedang buka' };
    };

    const storeStatus = getStoreStatus();

    const handleEditClick = (field) => {
        setEditMode(prev => ({ ...prev, [field]: true }));
        setTempValues(prev => ({ ...prev, [field]: settings[field] || '' }));
    };

    const handleCancelEdit = (field) => {
        setEditMode(prev => ({ ...prev, [field]: false }));
        setTempValues(prev => ({ ...prev, [field]: settings[field] || '' }));
    };

    const handleSaveEdit = async (field) => {
        await updateSetting(field, tempValues[field]);
        setEditMode(prev => ({ ...prev, [field]: false }));
    };

    const handleTempValueChange = (field, value) => {
        setTempValues(prev => ({ ...prev, [field]: value }));
    };

    const handleManualSync = async () => {
        setSaving(true);
        try {
            const response = await staffAPI.syncAutoSchedule();
            
            if (response.data.success) {
                notify.success(`Database diperbarui: order_enabled = ${response.data.order_enabled} (${response.data.status})`);
                // Refresh store status dan settings
                await fetchRealTimeStatus();
                await fetchSettings();
            } else {
                notify.error(response.data.error || 'Gagal sync auto-schedule');
            }
        } catch (error) {
            console.error('Error syncing auto-schedule:', error);
            notify.error(error.response?.data?.error || 'Gagal sync auto-schedule');
        } finally {
            setSaving(false);
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
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Header */}
                <div className="mb-6">
                    <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Pengaturan Toko</h1>
                    <p className="text-gray-600 mt-1 sm:mt-2 text-sm sm:text-base">Kelola informasi toko, sistem delivery dan order</p>
                    <div className="mt-3">
                        <Link to="/admin/whatsapp-settings" className="inline-flex items-center text-sm text-primary-600 hover:underline">
                            Atur Notifikasi WhatsApp →
                        </Link>
                    </div>
                </div>

                {/* Settings Cards */}
                <div className="space-y-6">
                    {/* Store Information Card */}
                    <div className="bg-white rounded-lg shadow-md overflow-hidden">
                        <div className="p-4 sm:p-6">
                            <div className="flex flex-col sm:flex-row sm:items-start sm:space-x-4 mb-6">
                                <div className="flex items-center sm:block mb-4 sm:mb-0">
                                    <div className="p-3 rounded-lg bg-blue-100 mr-3 sm:mr-0">
                                        <svg className="w-6 h-6 sm:w-8 sm:h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                    </div>
                                    <div className="sm:hidden">
                                        <h2 className="text-lg font-bold text-gray-900">
                                            Informasi Toko
                                        </h2>
                                    </div>
                                </div>
                                <div className="flex-1">
                                    <h2 className="hidden sm:block text-xl font-bold text-gray-900 mb-2">
                                        Informasi Toko
                                    </h2>
                                    <p className="text-gray-600 mb-4 text-sm sm:text-base">
                                        Informasi toko akan ditampilkan di struk dan halaman publik
                                    </p>
                                </div>
                            </div>

                            {/* Store Name */}
                            <div className="mb-4 pb-4 border-b border-gray-200">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Nama Toko
                                </label>
                                {editMode.store_name ? (
                                    <div className="space-y-3 sm:space-y-0 sm:flex sm:items-center sm:gap-2">
                                        <input
                                            type="text"
                                            value={tempValues.store_name}
                                            onChange={(e) => handleTempValueChange('store_name', e.target.value)}
                                            className="w-full sm:flex-1 rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                                            placeholder="Contoh: Kedai Yuru"
                                        />
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => handleSaveEdit('store_name')}
                                                disabled={saving}
                                                className="flex-1 sm:flex-none px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 text-sm"
                                            >
                                                ✓ Simpan
                                            </button>
                                            <button
                                                onClick={() => handleCancelEdit('store_name')}
                                                disabled={saving}
                                                className="flex-1 sm:flex-none px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 disabled:opacity-50 text-sm"
                                            >
                                                ✕ Batal
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex items-center justify-between">
                                        <p className="text-gray-900 font-medium flex-1 mr-4">
                                            {settings.store_name || '(Belum diisi)'}
                                        </p>
                                        <button
                                            onClick={() => handleEditClick('store_name')}
                                            className="text-primary-600 hover:text-primary-700 text-sm font-medium whitespace-nowrap px-2 py-1"
                                        >
                                            ✏️ Edit
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Store Address */}
                            <div className="mb-4 pb-4 border-b border-gray-200">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Alamat Toko
                                </label>
                                {editMode.store_address ? (
                                    <div className="space-y-3">
                                        <textarea
                                            value={tempValues.store_address}
                                            onChange={(e) => handleTempValueChange('store_address', e.target.value)}
                                            rows={3}
                                            className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                                            placeholder="Contoh: Jl. Raya No. 123, Jakarta"
                                        />
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => handleSaveEdit('store_address')}
                                                disabled={saving}
                                                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 text-sm"
                                            >
                                                ✓ Simpan
                                            </button>
                                            <button
                                                onClick={() => handleCancelEdit('store_address')}
                                                disabled={saving}
                                                className="flex-1 px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 disabled:opacity-50 text-sm"
                                            >
                                                ✕ Batal
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex items-start justify-between">
                                        <p className="text-gray-900 font-medium whitespace-pre-wrap flex-1 mr-4">
                                            {settings.store_address || '(Belum diisi)'}
                                        </p>
                                        <button
                                            onClick={() => handleEditClick('store_address')}
                                            className="text-primary-600 hover:text-primary-700 text-sm font-medium whitespace-nowrap px-2 py-1"
                                        >
                                            ✏️ Edit
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Store Phone */}
                            <div className="mb-0">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Nomor Telepon
                                </label>
                                {editMode.store_phone ? (
                                    <div className="space-y-3 sm:space-y-0 sm:flex sm:items-center sm:gap-2">
                                        <input
                                            type="text"
                                            value={tempValues.store_phone}
                                            onChange={(e) => handleTempValueChange('store_phone', e.target.value)}
                                            className="w-full sm:flex-1 rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                                            placeholder="Contoh: 081234567890"
                                        />
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => handleSaveEdit('store_phone')}
                                                disabled={saving}
                                                className="flex-1 sm:flex-none px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 text-sm"
                                            >
                                                ✓ Simpan
                                            </button>
                                            <button
                                                onClick={() => handleCancelEdit('store_phone')}
                                                disabled={saving}
                                                className="flex-1 sm:flex-none px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 disabled:opacity-50 text-sm"
                                            >
                                                ✕ Batal
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex items-center justify-between">
                                        <p className="text-gray-900 font-medium flex-1 mr-4">
                                            {settings.store_phone || '(Belum diisi)'}
                                        </p>
                                        <button
                                            onClick={() => handleEditClick('store_phone')}
                                            className="text-primary-600 hover:text-primary-700 text-sm font-medium whitespace-nowrap px-2 py-1"
                                        >
                                            ✏️ Edit
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Delivery System Card */}
                    <div className="bg-white rounded-lg shadow-md overflow-hidden">
                        <div className="p-4 sm:p-6">
                            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between">
                                <div className="flex flex-col sm:flex-row sm:items-start sm:space-x-4 mb-6 sm:mb-0">
                                    <div className="flex items-center sm:block mb-4 sm:mb-0">
                                        <div className={`p-3 rounded-lg mr-3 sm:mr-0 ${
                                            settings.delivery_enabled 
                                                ? 'bg-green-100' 
                                                : 'bg-red-100'
                                        }`}>
                                            <svg 
                                                className={`w-6 h-6 sm:w-8 sm:h-8 ${
                                                    settings.delivery_enabled 
                                                        ? 'text-green-600' 
                                                        : 'text-red-600'
                                                }`} 
                                                fill="none" 
                                                stroke="currentColor" 
                                                viewBox="0 0 24 24"
                                            >
                                                <path 
                                                    strokeLinecap="round" 
                                                    strokeLinejoin="round" 
                                                    strokeWidth={2} 
                                                    d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" 
                                                />
                                            </svg>
                                        </div>
                                        <div className="sm:hidden">
                                            <h2 className="text-lg font-bold text-gray-900">
                                                Sistem Delivery
                                            </h2>
                                        </div>
                                    </div>
                                    <div className="flex-1">
                                        <h2 className="hidden sm:block text-xl font-bold text-gray-900 mb-2">
                                            Sistem Delivery
                                        </h2>
                                        <p className="text-gray-600 mb-4 text-sm sm:text-base">
                                            {settings.delivery_enabled 
                                                ? '✅ Sistem delivery sedang AKTIF. Customer dapat memesan dengan delivery.'
                                                : '⚠️ Sistem delivery sedang NONAKTIF. Customer hanya dapat pickup.'
                                            }
                                        </p>
                                        <div className="bg-blue-50 border-l-4 border-blue-400 p-3 sm:p-4 rounded">
                                            <div className="flex items-start">
                                                <svg className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 mr-2 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                                                </svg>
                                                <div>
                                                    <p className="text-xs sm:text-sm font-medium text-blue-800">Kapan harus dimatikan?</p>
                                                    <ul className="text-xs sm:text-sm text-blue-700 mt-1 list-disc list-inside">
                                                        <li>Toko sedang sangat ramai</li>
                                                        <li>Kurir tidak tersedia</li>
                                                    </ul>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex justify-center sm:justify-start sm:ml-4">
                                    <div className="flex flex-col items-center">
                                        <button
                                            onClick={handleToggleDelivery}
                                            disabled={saving}
                                            className={`relative inline-flex h-10 w-20 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 ${
                                                settings.delivery_enabled 
                                                    ? 'bg-green-600' 
                                                    : 'bg-gray-300'
                                            } ${saving ? 'opacity-50 cursor-not-allowed' : ''}`}
                                        >
                                            <span
                                                className={`inline-block h-8 w-8 transform rounded-full bg-white shadow-lg transition-transform ${
                                                    settings.delivery_enabled ? 'translate-x-11' : 'translate-x-1'
                                                }`}
                                            />
                                        </button>
                                        <p className={`text-xs font-semibold mt-2 text-center ${
                                            settings.delivery_enabled ? 'text-green-600' : 'text-red-600'
                                        }`}>
                                            {settings.delivery_enabled ? 'AKTIF' : 'NONAKTIF'}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ✅ Operating Hours Card */}
                    <div className="bg-white rounded-lg shadow-md overflow-hidden">
                        <div className="p-4 sm:p-6">
                            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between">
                                <div className="flex flex-col sm:flex-row sm:items-start sm:space-x-4 mb-6 sm:mb-0">
                                    <div className="flex items-center sm:block mb-4 sm:mb-0">
                                        <div className="p-3 rounded-lg bg-indigo-100 mr-3 sm:mr-0">
                                            <svg className="w-6 h-6 sm:w-8 sm:h-8 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                        </div>
                                        <div className="sm:hidden">
                                            <h2 className="text-lg font-bold text-gray-900">
                                                Jam Operasional Otomatis
                                            </h2>
                                        </div>
                                    </div>
                                    <div className="flex-1">
                                        <h2 className="hidden sm:block text-xl font-bold text-gray-900 mb-2">
                                            Jam Operasional Otomatis
                                        </h2>
                                        <p className="text-gray-600 mb-4 text-sm sm:text-base">
                                            {settings.auto_schedule_enabled 
                                                ? `⏰ Toko otomatis tutup ${settings.closing_time} dan buka ${settings.opening_time}`
                                                : '🕰️ Pengaturan manual aktif. Jam operasional otomatis dimatikan.'
                                            }
                                        </p>

                                        {/* Status Display */}
                                        <div className={`p-3 rounded-lg mb-4 ${
                                            storeStatus.status === 'open' 
                                                ? 'bg-green-50 border border-green-200' 
                                                : 'bg-red-50 border border-red-200'
                                        }`}>
                                            <p className={`font-medium text-sm sm:text-base ${
                                                storeStatus.status === 'open' ? 'text-green-800' : 'text-red-800'
                                            }`}>
                                                Status saat ini: {storeStatus.status === 'open' ? '🟢 BUKA' : '🔴 TUTUP'}
                                            </p>
                                            <p className={`text-xs sm:text-sm ${
                                                storeStatus.status === 'open' ? 'text-green-600' : 'text-red-600'
                                            }`}>
                                                {storeStatus.message}
                                            </p>
                                        </div>

                                        {/* Time Settings */}
                                        {settings.auto_schedule_enabled && (
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                                        Jam Buka
                                                    </label>
                                                    <input
                                                        type="time"
                                                        value={settings.opening_time}
                                                        onChange={(e) => handleTimeChange('opening_time', e.target.value)}
                                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500 text-sm sm:text-base"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                                        Jam Tutup
                                                    </label>
                                                    <input
                                                        type="time"
                                                        value={settings.closing_time}
                                                        onChange={(e) => handleTimeChange('closing_time', e.target.value)}
                                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500 text-sm sm:text-base"
                                                    />
                                                </div>
                                            </div>
                                        )}

                                        <div className="bg-blue-50 border-l-4 border-blue-400 p-3 sm:p-4 rounded">
                                            <div className="flex items-start">
                                                <svg className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 mr-2 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                                                </svg>
                                                <div>
                                                    <p className="text-xs sm:text-sm font-medium text-blue-800">Cara Kerja Otomatis:</p>
                                                    <ul className="text-xs sm:text-sm text-blue-700 mt-1 list-disc list-inside">
                                                        <li>Sistem akan otomatis menutup toko saat jam tutup</li>
                                                        <li>Sistem akan otomatis membuka toko saat jam buka</li>
                                                        <li>Customer melihat "Toko Tutup" di luar jam operasional</li>
                                                        <li>Manual override masih bisa digunakan</li>
                                                    </ul>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex justify-center sm:justify-start sm:ml-4">
                                    <div className="flex flex-col items-center">
                                        <button
                                            onClick={handleToggleAutoSchedule}
                                            disabled={saving}
                                            className={`relative inline-flex h-10 w-20 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${
                                                settings.auto_schedule_enabled 
                                                    ? 'bg-indigo-600' 
                                                    : 'bg-gray-400'
                                            } ${saving ? 'opacity-50 cursor-not-allowed' : ''}`}
                                        >
                                            <span
                                                className={`inline-block h-8 w-8 transform rounded-full bg-white shadow-lg transition-transform ${
                                                    settings.auto_schedule_enabled ? 'translate-x-11' : 'translate-x-1'
                                                }`}
                                            />
                                        </button>
                                        <p className={`text-xs font-semibold mt-2 text-center ${
                                            settings.auto_schedule_enabled ? 'text-indigo-600' : 'text-gray-500'
                                        }`}>
                                            {settings.auto_schedule_enabled ? 'AKTIF' : 'NONAKTIF'}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Order System Card */}
                    <div className="bg-white rounded-lg shadow-md overflow-hidden">
                        <div className="p-4 sm:p-6">
                            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between">
                                <div className="flex flex-col sm:flex-row sm:items-start sm:space-x-4 mb-6 sm:mb-0">
                                    <div className="flex items-center sm:block mb-4 sm:mb-0">
                                        <div className={`p-3 rounded-lg mr-3 sm:mr-0 ${
                                            storeStatus.status === 'open'
                                                ? 'bg-green-100' 
                                                : 'bg-red-100'
                                        }`}>
                                            <svg 
                                                className={`w-6 h-6 sm:w-8 sm:h-8 ${
                                                    storeStatus.status === 'open'
                                                        ? 'text-green-600' 
                                                        : 'text-red-600'
                                                }`} 
                                                fill="none" 
                                                stroke="currentColor" 
                                                viewBox="0 0 24 24"
                                            >
                                                <path 
                                                    strokeLinecap="round" 
                                                    strokeLinejoin="round" 
                                                    strokeWidth={2} 
                                                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" 
                                                />
                                            </svg>
                                        </div>
                                        <div className="sm:hidden">
                                            <h2 className="text-lg font-bold text-gray-900">
                                                Sistem Order
                                            </h2>
                                        </div>
                                    </div>
                                    <div className="flex-1">
                                        <h2 className="hidden sm:block text-xl font-bold text-gray-900 mb-2">
                                            Sistem Order
                                        </h2>

                                        {/* Status Display dengan Design Lebih Menarik */}
                                        <div className={`p-4 rounded-lg mb-4 border-2 ${
                                            storeStatus.status === 'open'
                                                ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-200' 
                                                : 'bg-gradient-to-r from-red-50 to-pink-50 border-red-200'
                                        }`}>
                                            <div className="flex items-center mb-2">
                                                <div className={`w-3 h-3 rounded-full mr-3 ${
                                                    storeStatus.status === 'open' ? 'bg-green-500' : 'bg-red-500'
                                                } animate-pulse`}></div>
                                                <p className={`font-bold text-lg ${
                                                    storeStatus.status === 'open' ? 'text-green-800' : 'text-red-800'
                                                }`}>
                                                    {storeStatus.status === 'open' ? '🟢 TOKO BUKA' : '🔴 TOKO TUTUP'}
                                                </p>
                                            </div>
                                            <p className={`text-sm ${
                                                storeStatus.status === 'open' ? 'text-green-700' : 'text-red-700'
                                            }`}>
                                                {storeStatus.status === 'open'
                                                    ? '✅ Customer dapat melakukan pemesanan'
                                                    : `🚫 ${storeStatus.message}`
                                                }
                                            </p>
                                        </div>

                                        {/* Info Box dengan Design Modern */}
                                        <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-lg p-3 sm:p-4">
                                            <div className="flex items-start">
                                                <div className="bg-amber-100 rounded-full p-2 mr-3 flex-shrink-0">
                                                    <svg className="w-4 h-4 sm:w-5 sm:h-5 text-amber-600" fill="currentColor" viewBox="0 0 20 20">
                                                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                                                    </svg>
                                                </div>
                                                <div>
                                                    <p className="text-xs sm:text-sm font-semibold text-amber-800 mb-2">💡 Kontrol Manual</p>
                                                    <ul className="text-xs sm:text-sm text-amber-700 space-y-1">
                                                        <li className="flex items-start">
                                                            <span className="text-amber-500 mr-2">•</span>
                                                            <span>Override untuk tutup manual saat emergency</span>
                                                        </li>
                                                        <li className="flex items-start">
                                                            <span className="text-amber-500 mr-2">•</span>
                                                            <span>Mencegah order di luar kendali</span>
                                                        </li>
                                                        <li className="flex items-start">
                                                            <span className="text-amber-500 mr-2">•</span>
                                                            <span>Jam operasional otomatis tetap berlaku</span>
                                                        </li>
                                                        <li className="flex items-start">
                                                            <span className="text-amber-500 mr-2">•</span>
                                                            <span>Customer akan melihat notifikasi "Toko Tutup"</span>
                                                        </li>
                                                    </ul>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Toggle Button dengan Design Modern */}
                                <div className="flex justify-center sm:justify-start sm:ml-4">
                                    <div className="flex flex-col items-center">
                                        <div className={`p-4 rounded-lg mb-3 ${
                                            storeStatus.status === 'open' ? 'bg-green-50' : 'bg-red-50'
                                        }`}>
                                            <button
                                                onClick={handleToggleOrder}
                                                disabled={saving}
                                                className={`relative inline-flex h-12 w-24 items-center rounded-full transition-all duration-300 focus:outline-none focus:ring-4 ${
                                                    storeStatus.status === 'open'
                                                        ? 'bg-green-600 focus:ring-green-200 shadow-lg shadow-green-200' 
                                                        : 'bg-red-600 focus:ring-red-200 shadow-lg shadow-red-200'
                                                } ${saving ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105'}`}
                                            >
                                                <span
                                                    className={`inline-block h-10 w-10 transform rounded-full bg-white shadow-lg transition-transform duration-300 flex items-center justify-center ${
                                                        settings.order_enabled ? 'translate-x-12' : 'translate-x-1'
                                                    }`}
                                                >
                                                    {settings.order_enabled ? (
                                                        <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                                                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                                        </svg>
                                                    ) : (
                                                        <svg className="w-5 h-5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                                                            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                                        </svg>
                                                    )}
                                                </span>
                                            </button>
                                        </div>
                                        <div className="text-center">
                                            <p className={`text-sm font-bold ${
                                                storeStatus.status === 'open' ? 'text-green-600' : 'text-red-600'
                                            }`}>
                                                {storeStatus.status === 'open' ? '🟢 BUKA' : '🔴 TUTUP'}
                                            </p>
                                            <p className="text-xs text-gray-500 mt-1">
                                                {settings.order_enabled ? 'Aktif' : 'Nonaktif'}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Manual Sync Button - untuk testing auto schedule */}
                    {settings.auto_schedule_enabled && (
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 sm:p-6">
                            <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4">
                                🔄 Manual Sync (Testing)
                            </h3>
                            <p className="text-xs sm:text-sm text-gray-600 mb-4">
                                Sync database order_enabled dengan status auto-schedule saat ini.
                            </p>
                            <button
                                onClick={handleManualSync}
                                disabled={saving}
                                className="w-full sm:w-auto bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
                            >
                                {saving ? 'Syncing...' : 'Sync Sekarang'}
                            </button>
                        </div>
                    )}

                    {/* Last Updated Info */}
                    {settings.updated_at && (
                        <div className="bg-gray-50 rounded-lg p-3 sm:p-4">
                            <p className="text-xs sm:text-sm text-gray-600">
                                <span className="font-medium">Terakhir diperbarui:</span>{' '}
                                {new Date(settings.updated_at).toLocaleString('id-ID', {
                                    weekday: 'long',
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                })}
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </AdminLayout>
    );
};

export default StoreSettings;