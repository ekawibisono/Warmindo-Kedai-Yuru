import React, { useState, useEffect } from 'react';
import AdminLayout from '../components/admin/AdminLayout';
import { staffAPI } from '../services/api';
import ConfirmDialog from '../components/common/ConfirmDialog';
import notify from '../components/common/Toast';

const Discounts = () => {
    const [discounts, setDiscounts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingDiscount, setEditingDiscount] = useState(null);
    const [deleteDialog, setDeleteDialog] = useState({ isOpen: false, id: null, name: '' });

    const [formData, setFormData] = useState({
        code: '',
        name: '',
        description: '',
        discount_type: 'percentage',
        value: '',
        min_order_amount: '',
        max_discount_amount: '',
        usage_limit: '',
        start_date: '',
        end_date: '',
        is_active: true
    });

    useEffect(() => {
        fetchDiscounts();
    }, []);

    const fetchDiscounts = async () => {
        setLoading(true);
        try {
            const response = await staffAPI.getDiscounts();
            setDiscounts(response.data.discounts || []);
        } catch (error) {
            console.error('Error fetching discounts:', error);
            notify.error('Gagal memuat data diskon');
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setFormData({
            code: '', name: '', description: '', discount_type: 'percentage',
            value: '', min_order_amount: '', max_discount_amount: '',
            usage_limit: '', start_date: '', end_date: '', is_active: true
        });
    };

    const handleOpenCreate = () => {
        setEditingDiscount(null);
        resetForm();
        setShowModal(true);
    };

    const handleOpenEdit = (discount) => {
        setEditingDiscount(discount);
        setFormData({
            code: discount.code || '',
            name: discount.name,
            description: discount.description || '',
            discount_type: discount.discount_type,
            value: discount.value,
            min_order_amount: discount.min_order_amount || '',
            max_discount_amount: discount.max_discount_amount || '',
            usage_limit: discount.usage_limit || '',
            start_date: discount.start_date ? discount.start_date.slice(0, 16) : '',
            end_date: discount.end_date ? discount.end_date.slice(0, 16) : '',
            is_active: discount.is_active
        });
        setShowModal(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.name || !formData.value) {
            notify.error('Nama dan nilai diskon wajib diisi');
            return;
        }

        const payload = {
            ...formData,
            value: parseFloat(formData.value),
            min_order_amount: formData.min_order_amount ? parseFloat(formData.min_order_amount) : 0,
            max_discount_amount: formData.max_discount_amount ? parseFloat(formData.max_discount_amount) : null,
            usage_limit: formData.usage_limit ? parseInt(formData.usage_limit) : null,
            start_date: formData.start_date || null,
            end_date: formData.end_date || null,
            code: formData.code || null
        };

        try {
            if (editingDiscount) {
                await staffAPI.updateDiscount(editingDiscount.id, payload);
                notify.success('Diskon berhasil diperbarui');
            } else {
                await staffAPI.createDiscount(payload);
                notify.success('Diskon berhasil dibuat');
            }
            setShowModal(false);
            fetchDiscounts();
        } catch (error) {
            notify.error(error.response?.data?.error || 'Gagal menyimpan diskon');
        }
    };

    const handleDelete = async () => {
        try {
            await staffAPI.deleteDiscount(deleteDialog.id);
            notify.success('Diskon berhasil dihapus');
            setDeleteDialog({ isOpen: false, id: null, name: '' });
            fetchDiscounts();
        } catch (error) {
            notify.error('Gagal menghapus diskon');
        }
    };

    const handleToggleActive = async (discount) => {
        try {
            await staffAPI.updateDiscount(discount.id, { is_active: !discount.is_active });
            notify.success(`Diskon ${discount.is_active ? 'dinonaktifkan' : 'diaktifkan'}`);
            fetchDiscounts();
        } catch (error) {
            notify.error('Gagal mengubah status diskon');
        }
    };

    const formatCurrency = (value) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(value);

    // eslint-disable-next-line no-unused-vars
    const formatDate = (dateStr) => {
        if (!dateStr) return '-';
        return new Date(dateStr).toLocaleString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    };

    const getDiscountLabel = (discount) => discount.discount_type === 'percentage' ? `${discount.value}%` : formatCurrency(discount.value);

    const getStatusBadge = (discount) => {
        const now = new Date();
        if (!discount.is_active) return <span className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded-full">Nonaktif</span>;
        if (discount.start_date && new Date(discount.start_date) > now) return <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded-full">Belum Mulai</span>;
        if (discount.end_date && new Date(discount.end_date) < now) return <span className="px-2 py-1 text-xs bg-red-100 text-red-800 rounded-full">Berakhir</span>;
        if (discount.usage_limit && discount.used_count >= discount.usage_limit) return <span className="px-2 py-1 text-xs bg-red-100 text-red-800 rounded-full">Kuota Habis</span>;
        return <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">Aktif</span>;
    };

    return (
        <AdminLayout>
            <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-800">Diskon & Promo</h1>
                        <p className="text-gray-600">Kelola kode promo dan diskon</p>
                    </div>
                    <button onClick={handleOpenCreate} className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 flex items-center">
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Tambah Diskon
                    </button>
                </div>

                <div className="bg-white rounded-lg shadow overflow-hidden">
                    {loading ? (
                        <div className="p-8 text-center">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nama</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Kode</th>
                                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Diskon</th>
                                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Min. Order</th>
                                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Penggunaan</th>
                                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {discounts.map((discount) => (
                                        <tr key={discount.id}>
                                            <td className="px-6 py-4">
                                                <div className="font-medium text-gray-900">{discount.name}</div>
                                                {discount.description && <div className="text-sm text-gray-500">{discount.description}</div>}
                                            </td>
                                            <td className="px-6 py-4">
                                                {discount.code ? <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded font-mono text-sm">{discount.code}</span> : <span className="text-gray-400">-</span>}
                                            </td>
                                            <td className="px-6 py-4 text-center font-semibold text-green-600">{getDiscountLabel(discount)}</td>
                                            <td className="px-6 py-4 text-center text-sm text-gray-500">{discount.min_order_amount > 0 ? formatCurrency(discount.min_order_amount) : '-'}</td>
                                            <td className="px-6 py-4 text-center text-sm">{discount.usage_limit ? `${discount.used_count} / ${discount.usage_limit}` : `${discount.used_count} (∞)`}</td>
                                            <td className="px-6 py-4 text-center">{getStatusBadge(discount)}</td>
                                            <td className="px-6 py-4 text-center">
                                                <div className="flex justify-center space-x-2">
                                                    <button onClick={() => handleToggleActive(discount)} className="p-1 text-yellow-600 hover:bg-yellow-50 rounded" title={discount.is_active ? 'Nonaktifkan' : 'Aktifkan'}>
                                                        {discount.is_active ? '⏸' : '▶'}
                                                    </button>
                                                    <button onClick={() => handleOpenEdit(discount)} className="p-1 text-blue-600 hover:bg-blue-50 rounded">✏️</button>
                                                    <button onClick={() => setDeleteDialog({ isOpen: true, id: discount.id, name: discount.name })} className="p-1 text-red-600 hover:bg-red-50 rounded">🗑️</button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {discounts.length === 0 && <div className="p-8 text-center text-gray-500">Belum ada diskon.</div>}
                        </div>
                    )}
                </div>

                {showModal && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                        <div className="bg-white rounded-lg p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
                            <h3 className="text-lg font-bold mb-4">{editingDiscount ? 'Edit Diskon' : 'Tambah Diskon Baru'}</h3>
                            <form onSubmit={handleSubmit}>
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Nama Diskon *</label>
                                        <input type="text" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className="w-full px-4 py-2 border border-gray-300 rounded-lg" required />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Kode Promo</label>
                                        <input type="text" value={formData.code} onChange={(e) => setFormData({...formData, code: e.target.value.toUpperCase()})} className="w-full px-4 py-2 border border-gray-300 rounded-lg font-mono" placeholder="HEMAT10" />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Tipe Diskon</label>
                                            <select value={formData.discount_type} onChange={(e) => setFormData({...formData, discount_type: e.target.value})} className="w-full px-4 py-2 border border-gray-300 rounded-lg">
                                                <option value="percentage">Persentase (%)</option>
                                                <option value="fixed">Nominal (Rp)</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Nilai *</label>
                                            <input type="number" min="0" value={formData.value} onChange={(e) => setFormData({...formData, value: e.target.value})} className="w-full px-4 py-2 border border-gray-300 rounded-lg" required />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Min. Order</label>
                                            <input type="number" min="0" value={formData.min_order_amount} onChange={(e) => setFormData({...formData, min_order_amount: e.target.value})} className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Maks. Diskon</label>
                                            <input type="number" min="0" value={formData.max_discount_amount} onChange={(e) => setFormData({...formData, max_discount_amount: e.target.value})} className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Batas Penggunaan</label>
                                        <input type="number" min="0" value={formData.usage_limit} onChange={(e) => setFormData({...formData, usage_limit: e.target.value})} className="w-full px-4 py-2 border border-gray-300 rounded-lg" placeholder="Unlimited" />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Mulai</label>
                                            <input type="datetime-local" value={formData.start_date} onChange={(e) => setFormData({...formData, start_date: e.target.value})} className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Berakhir</label>
                                            <input type="datetime-local" value={formData.end_date} onChange={(e) => setFormData({...formData, end_date: e.target.value})} className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
                                        </div>
                                    </div>
                                    <label className="flex items-center">
                                        <input type="checkbox" checked={formData.is_active} onChange={(e) => setFormData({...formData, is_active: e.target.checked})} className="mr-2 h-4 w-4" />
                                        <span>Aktif</span>
                                    </label>
                                </div>
                                <div className="flex justify-end space-x-3 mt-6">
                                    <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 bg-gray-100 rounded-lg">Batal</button>
                                    <button type="submit" className="px-4 py-2 bg-blue-500 text-white rounded-lg">{editingDiscount ? 'Simpan' : 'Buat'}</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                <ConfirmDialog isOpen={deleteDialog.isOpen} title="Hapus Diskon?" message={`Hapus "${deleteDialog.name}"?`} confirmText="Hapus" confirmStyle="danger" onConfirm={handleDelete} onCancel={() => setDeleteDialog({ isOpen: false, id: null, name: '' })} />
            </div>
        </AdminLayout>
    );
};

export default Discounts;
