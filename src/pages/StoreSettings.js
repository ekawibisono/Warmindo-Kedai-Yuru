import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import AdminLayout from '../components/admin/AdminLayout';
import { staffAPI } from '../services/api';
import notify from '../components/common/Toast';

const StoreSettings = () => {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [settings, setSettings] = useState({
        delivery_enabled: true,
        order_enabled: true,
        updated_at: null
    });

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        setLoading(true);
        try {
            const response = await staffAPI.getStoreSettings();
            // Merge with default settings to ensure all keys exist
            setSettings(prev => ({
                ...prev,
                ...(response.data.settings || {})
            }));
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
                {/* Header */}
                <div className="mb-6">
                    <h1 className="text-3xl font-bold text-gray-900">Pengaturan Toko</h1>
                    <p className="text-gray-600 mt-2">Kelola sistem delivery dan order toko Anda</p>
                    <div className="mt-3">
                        <Link to="/admin/whatsapp-settings" className="inline-flex items-center text-sm text-primary-600 hover:underline">
                            Atur Notifikasi WhatsApp →
                        </Link>
                    </div>
                </div>

                {/* Settings Cards */}
                <div className="space-y-6">
                    {/* Delivery System Card */}
                    <div className="bg-white rounded-lg shadow-md overflow-hidden">
                        <div className="p-6">
                            <div className="flex items-start justify-between">
                                <div className="flex items-start space-x-4">
                                    <div className={`p-3 rounded-lg ${
                                        settings.delivery_enabled 
                                            ? 'bg-green-100' 
                                            : 'bg-red-100'
                                    }`}>
                                        <svg 
                                            className={`w-8 h-8 ${
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
                                    <div className="flex-1">
                                        <h2 className="text-xl font-bold text-gray-900 mb-2">
                                            Sistem Delivery
                                        </h2>
                                        <p className="text-gray-600 mb-4">
                                            {settings.delivery_enabled 
                                                ? '✅ Sistem delivery sedang AKTIF. Customer dapat memesan dengan delivery.'
                                                : '⚠️ Sistem delivery sedang NONAKTIF. Customer hanya dapat pickup.'
                                            }
                                        </p>
                                        <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded">
                                            <div className="flex items-start">
                                                <svg className="w-5 h-5 text-blue-600 mr-2 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                                                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                                                </svg>
                                                <div>
                                                    <p className="text-sm font-medium text-blue-800">Kapan harus nonaktifkan?</p>
                                                    <ul className="text-sm text-blue-700 mt-1 list-disc list-inside">
                                                        <li>Saat hujan deras</li>
                                                        <li>Toko sedang sangat ramai</li>
                                                        <li>Kurir tidak tersedia</li>
                                                    </ul>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="ml-4">
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

                    {/* Order System Card */}
                    <div className="bg-white rounded-lg shadow-md overflow-hidden">
                        <div className="p-6">
                            <div className="flex items-start justify-between">
                                <div className="flex items-start space-x-4">
                                    <div className={`p-3 rounded-lg ${
                                        settings.order_enabled 
                                            ? 'bg-green-100' 
                                            : 'bg-red-100'
                                    }`}>
                                        <svg 
                                            className={`w-8 h-8 ${
                                                settings.order_enabled 
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
                                    <div className="flex-1">
                                        <h2 className="text-xl font-bold text-gray-900 mb-2">
                                            Sistem Order
                                        </h2>
                                        <p className="text-gray-600 mb-4">
                                            {settings.order_enabled 
                                                ? '✅ Toko sedang BUKA. Customer dapat melakukan pemesanan.'
                                                : '🔒 Toko sedang TUTUP. Customer tidak dapat melakukan pemesanan.'
                                            }
                                        </p>
                                        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded">
                                            <div className="flex items-start">
                                                <svg className="w-5 h-5 text-yellow-600 mr-2 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                                                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                                </svg>
                                                <div>
                                                    <p className="text-sm font-medium text-yellow-800">Penting!</p>
                                                    <ul className="text-sm text-yellow-700 mt-1 list-disc list-inside">
                                                        <li>Matikan saat toko tutup untuk jam operasional</li>
                                                        <li>Mencegah order di luar jam buka</li>
                                                        <li>Customer akan melihat notifikasi "Toko Tutup"</li>
                                                    </ul>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="ml-4">
                                    <button
                                        onClick={handleToggleOrder}
                                        disabled={saving}
                                        className={`relative inline-flex h-10 w-20 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 ${
                                            settings.order_enabled 
                                                ? 'bg-green-600' 
                                                : 'bg-red-600'
                                        } ${saving ? 'opacity-50 cursor-not-allowed' : ''}`}
                                    >
                                        <span
                                            className={`inline-block h-8 w-8 transform rounded-full bg-white shadow-lg transition-transform ${
                                                settings.order_enabled ? 'translate-x-11' : 'translate-x-1'
                                            }`}
                                        />
                                    </button>
                                    <p className={`text-xs font-semibold mt-2 text-center ${
                                        settings.order_enabled ? 'text-green-600' : 'text-red-600'
                                    }`}>
                                        {settings.order_enabled ? 'BUKA' : 'TUTUP'}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Last Updated Info */}
                    {settings.updated_at && (
                        <div className="bg-gray-50 rounded-lg p-4">
                            <p className="text-sm text-gray-600">
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