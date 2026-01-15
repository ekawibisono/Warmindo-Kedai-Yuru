import React, { useState, useEffect } from 'react';
import AdminLayout from '../components/admin/AdminLayout';
import { staffAPI } from '../services/api';
import notify from '../components/common/Toast';
import ConfirmDialog from '../components/common/ConfirmDialog';

const StaffManagement = () => {
    const [loading, setLoading] = useState(true);
    const [staffList, setStaffList] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [showKeyModal, setShowKeyModal] = useState(false);
    const [selectedStaff, setSelectedStaff] = useState(null);
    const [confirmDialog, setConfirmDialog] = useState({ show: false, id: null });

    const [formData, setFormData] = useState({
        username: '',
        full_name: '',
        role: 'kasir'
    });

    const [keyMode, setKeyMode] = useState('auto'); // 'auto' or 'manual'
    const [customKey, setCustomKey] = useState('');

    useEffect(() => {
        fetchStaff();
    }, []);

    const fetchStaff = async () => {
        setLoading(true);
        try {
            const res = await staffAPI.getStaffList();
            setStaffList(res.data.data || []);
        } catch (error) {
            console.error(error);
            notify.error('Gagal memuat data staff');
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async (e) => {
        e.preventDefault();
        try {
            const payload = { ...formData };
            if (keyMode === 'manual' && customKey) {
                payload.custom_key = customKey;
            }
            
            const res = await staffAPI.createStaff(payload);
            notify.success('Staff berhasil ditambahkan!');
            setShowModal(false);
            setFormData({ username: '', full_name: '', role: 'kasir' });
            setKeyMode('auto');
            setCustomKey('');
            fetchStaff();

            // Show the staff_key to admin
            setSelectedStaff(res.data.data);
            setShowKeyModal(true);
        } catch (error) {
            console.error(error);
            notify.error(error.response?.data?.error || 'Gagal menambah staff');
        }
    };

    const handleUpdate = async (id, updates) => {
        try {
            await staffAPI.updateStaff(id, updates);
            notify.success('Staff berhasil diperbarui!');
            fetchStaff();
        } catch (error) {
            console.error(error);
            notify.error('Gagal memperbarui staff');
        }
    };

    const handleRegenerateKey = async (id) => {
        try {
            const res = await staffAPI.regenerateStaffKey(id);
            notify.success('Staff key berhasil di-regenerate!');
            setSelectedStaff(res.data.data);
            setShowKeyModal(true);
            fetchStaff();
        } catch (error) {
            console.error(error);
            notify.error('Gagal regenerate key');
        }
    };

    const handleDelete = async (id) => {
        try {
            await staffAPI.deleteStaff(id);
            notify.success('Staff berhasil dinonaktifkan!');
            setConfirmDialog({ show: false, id: null });
            fetchStaff();
        } catch (error) {
            console.error(error);
            notify.error('Gagal menonaktifkan staff');
        }
    };

    const getRoleBadge = (role) => {
        return role === 'admin'
            ? <span className="px-2 py-1 text-xs rounded-full bg-purple-100 text-purple-700 font-medium">Admin</span>
            : <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-700 font-medium">Kasir</span>;
    };

    const getStatusBadge = (isActive) => {
        return isActive
            ? <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-700 font-medium">Aktif</span>
            : <span className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-700 font-medium">Nonaktif</span>;
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
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">👥 Manajemen Staff</h1>
                        <p className="text-gray-600 mt-1">Kelola akun kasir dan admin</p>
                    </div>
                    <button
                        onClick={() => setShowModal(true)}
                        className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center gap-2"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Tambah Staff
                    </button>
                </div>

                {/* Staff List */}
                <div className="bg-white rounded-lg shadow-md overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Username</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nama Lengkap</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Dibuat</th>
                                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {staffList.map((staff) => (
                                <tr key={staff.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm font-medium text-gray-900">{staff.username}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm text-gray-900">{staff.full_name}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        {getRoleBadge(staff.role)}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        {getStatusBadge(staff.is_active)}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {new Date(staff.created_at).toLocaleDateString('id-ID')}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                                        <div className="flex justify-center gap-2">
                                            <button
                                                onClick={() => handleUpdate(staff.id, { is_active: !staff.is_active })}
                                                className={`px-3 py-1 rounded ${staff.is_active ? 'bg-red-100 text-red-700 hover:bg-red-200' : 'bg-green-100 text-green-700 hover:bg-green-200'}`}
                                                title={staff.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                                            >
                                                {staff.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                                            </button>
                                            <button
                                                onClick={() => handleRegenerateKey(staff.id)}
                                                className="px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                                                title="Regenerate Key"
                                            >
                                                🔑 Reset Key
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    {staffList.length === 0 && (
                        <div className="text-center py-12 text-gray-500">
                            Belum ada staff. Tambahkan staff pertama Anda!
                        </div>
                    )}
                </div>
            </div>

            {/* Create Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-lg max-w-md w-full p-6">
                        <h2 className="text-2xl font-bold mb-4">Tambah Staff Baru</h2>
                        <form onSubmit={handleCreate}>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
                                    <input
                                        type="text"
                                        value={formData.username}
                                        onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                                        className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Nama Lengkap</label>
                                    <input
                                        type="text"
                                        value={formData.full_name}
                                        onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                                        className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                                    <select
                                        value={formData.role}
                                        onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                                        className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                                    >
                                        <option value="kasir">Kasir</option>
                                        <option value="admin">Admin</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Mode Key</label>
                                    <div className="flex gap-4 mb-2">
                                        <label className="flex items-center">
                                            <input
                                                type="radio"
                                                value="auto"
                                                checked={keyMode === 'auto'}
                                                onChange={(e) => setKeyMode(e.target.value)}
                                                className="mr-2"
                                            />
                                            Auto Generate (format: {formData.role}-xxxxx)
                                        </label>
                                        <label className="flex items-center">
                                            <input
                                                type="radio"
                                                value="manual"
                                                checked={keyMode === 'manual'}
                                                onChange={(e) => setKeyMode(e.target.value)}
                                                className="mr-2"
                                            />
                                            Input Manual
                                        </label>
                                    </div>

                                    {keyMode === 'manual' && (
                                        <input
                                            type="text"
                                            value={customKey}
                                            onChange={(e) => setCustomKey(e.target.value)}
                                            placeholder="Masukkan key custom (contoh: admin-12345)"
                                            className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                                            required={keyMode === 'manual'}
                                        />
                                    )}
                                </div>
                            </div>

                            <div className="flex gap-3 mt-6">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowModal(false);
                                        setFormData({ username: '', full_name: '', role: 'kasir' });
                                        setKeyMode('auto');
                                        setCustomKey('');
                                    }}
                                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                                >
                                    Batal
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                                >
                                    Simpan
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Staff Key Modal */}
            {showKeyModal && selectedStaff && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-lg max-w-md w-full p-6">
                        <h2 className="text-2xl font-bold mb-4">🔑 Staff Key</h2>
                        <p className="text-gray-600 mb-4">
                            Berikan key ini kepada <strong>{selectedStaff.username}</strong> untuk login:
                        </p>

                        <div className="bg-gray-50 rounded-lg p-4 mb-4">
                            <code className="text-sm break-all text-primary-600 font-mono">
                                {selectedStaff.staff_key}
                            </code>
                        </div>

                        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
                            <p className="text-sm text-yellow-700">
                                ⚠️ <strong>Penting:</strong> Key ini hanya ditampilkan sekali. Simpan dengan aman!
                            </p>
                        </div>

                        <button
                            onClick={() => {
                                // Fallback copy method for better compatibility
                                try {
                                    if (navigator.clipboard && navigator.clipboard.writeText) {
                                        navigator.clipboard.writeText(selectedStaff.staff_key);
                                        notify.success('Key berhasil dicopy!');
                                    } else {
                                        // Fallback method
                                        const textarea = document.createElement('textarea');
                                        textarea.value = selectedStaff.staff_key;
                                        textarea.style.position = 'fixed';
                                        textarea.style.opacity = '0';
                                        document.body.appendChild(textarea);
                                        textarea.select();
                                        document.execCommand('copy');
                                        document.body.removeChild(textarea);
                                        notify.success('Key berhasil dicopy!');
                                    }
                                } catch (error) {
                                    console.error('Copy failed:', error);
                                    notify.error('Gagal copy key. Silakan copy manual.');
                                }
                            }}
                            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 mb-2"
                        >
                            📋 Copy Key
                        </button>

                        <button
                            onClick={() => {
                                setShowKeyModal(false);
                                setSelectedStaff(null);
                            }}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                        >
                            Tutup
                        </button>
                    </div>
                </div>
            )}

            {/* Confirm Dialog */}
            <ConfirmDialog
                isOpen={confirmDialog.show}
                title="Nonaktifkan Staff?"
                message="Staff akan dinonaktifkan dan tidak bisa login lagi."
                onConfirm={() => handleDelete(confirmDialog.id)}
                onCancel={() => setConfirmDialog({ show: false, id: null })}
            />
        </AdminLayout>
    );
};

export default StaffManagement;
