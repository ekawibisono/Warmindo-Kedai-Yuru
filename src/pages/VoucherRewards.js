import React, { useState, useEffect, useCallback } from 'react';
import AdminLayout from '../components/admin/AdminLayout';
import ConfirmDialog from '../components/common/ConfirmDialog';
import { staffAPI } from '../services/api';
import { notify } from '../components/common/Toast';

const VoucherRewards = () => {
  const [vouchers, setVouchers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingVoucher, setEditingVoucher] = useState(null);
  const [activeFilter, setActiveFilter] = useState('all');
  const [deleteDialog, setDeleteDialog] = useState({
    isOpen: false,
    voucherId: null,
    voucherName: ''
  });

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    points_required: '',
    discount_type: 'percentage',
    discount_value: '',
    discount_scope: 'order',
    min_order_amount: '',
    max_discount_amount: '',
    valid_days: '30',
    stock_quantity: '',
    max_redeem_per_user: '1',
    applies_to_product_ids: '',
    applies_to_category_ids: '',
    is_active: true
  });

  const fetchVouchers = useCallback(async () => {
    try {
      setLoading(true);
      const response = await staffAPI.getVoucherRewards(activeFilter === 'active');
      const data = response.data.data;
      // Ensure data is always an array
      setVouchers(Array.isArray(data) ? data : []);
    } catch (error) {
      notify.error('Gagal memuat data voucher');
      console.error('Error fetching vouchers:', error);
      setVouchers([]); // Reset to empty array on error
    } finally {
      setLoading(false);
    }
  }, [activeFilter]);

  useEffect(() => {
    fetchVouchers();
  }, [fetchVouchers]);

  const handleOpenModal = (voucher = null) => {
    if (voucher) {
      setEditingVoucher(voucher);
      setFormData({
        name: voucher.name || '',
        description: voucher.description || '',
        points_required: voucher.points_required || '',
        discount_type: voucher.discount_type || 'percentage',
        discount_value: voucher.discount_value || '',
        discount_scope: voucher.discount_scope || 'order',
        min_order_amount: voucher.min_order_amount || '',
        max_discount_amount: voucher.max_discount_amount || '',
        valid_days: voucher.valid_days || '30',
        stock_quantity: voucher.stock_quantity || '',
        max_redeem_per_user: voucher.max_redeem_per_user || '1',
        applies_to_product_ids: voucher.applies_to_product_ids?.join(',') || '',
        applies_to_category_ids: voucher.applies_to_category_ids?.join(',') || '',
        is_active: voucher.is_active !== false
      });
    } else {
      setEditingVoucher(null);
      setFormData({
        name: '',
        description: '',
        points_required: '',
        discount_type: 'percentage',
        discount_value: '',
        discount_scope: 'order',
        min_order_amount: '',
        max_discount_amount: '',
        valid_days: '30',
        stock_quantity: '',
        max_redeem_per_user: '1',
        applies_to_product_ids: '',
        applies_to_category_ids: '',
        is_active: true
      });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingVoucher(null);
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation
    if (!formData.name || !formData.points_required || !formData.discount_value) {
      notify.error('Mohon lengkapi field yang wajib diisi');
      return;
    }

    try {
      const submitData = {
        ...formData,
        points_required: parseInt(formData.points_required),
        discount_value: parseFloat(formData.discount_value),
        min_order_amount: formData.min_order_amount ? parseFloat(formData.min_order_amount) : 0,
        max_discount_amount: formData.max_discount_amount ? parseFloat(formData.max_discount_amount) : null,
        valid_days: parseInt(formData.valid_days),
        stock_quantity: formData.stock_quantity ? parseInt(formData.stock_quantity) : null,
        max_redeem_per_user: formData.max_redeem_per_user ? parseInt(formData.max_redeem_per_user) : null,
        applies_to_product_ids: formData.applies_to_product_ids 
          ? formData.applies_to_product_ids.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id))
          : null,
        applies_to_category_ids: formData.applies_to_category_ids 
          ? formData.applies_to_category_ids.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id))
          : null,
      };

      if (editingVoucher) {
        await staffAPI.updateVoucherReward(editingVoucher.id, submitData);
        notify.success('Voucher berhasil diperbarui');
      } else {
        await staffAPI.createVoucherReward(submitData);
        notify.success('Voucher berhasil dibuat');
      }

      handleCloseModal();
      fetchVouchers();
    } catch (error) {
      const message = error.response?.data?.message || 'Gagal menyimpan voucher';
      notify.error(message);
      console.error('Error saving voucher:', error);
    }
  };

  const handleDelete = (id, name) => {
    setDeleteDialog({
      isOpen: true,
      voucherId: id,
      voucherName: name
    });
  };

  const confirmDeleteVoucher = async () => {
    try {
      // Note: Backend API does soft delete (removes from active listing)
      await staffAPI.deleteVoucherReward(deleteDialog.voucherId);
      notify.success('Voucher berhasil dihapus dari daftar');
      fetchVouchers();
      setDeleteDialog({ isOpen: false, voucherId: null, voucherName: '' });
    } catch (error) {
      notify.error('Gagal menghapus voucher');
      console.error('Error deleting voucher:', error);
    }
  };

  const formatRupiah = (number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(number);
  };

  return (
    <AdminLayout>
      <div className="p-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-2">
            Kelola Voucher Rewards
          </h1>
          <p className="text-gray-600 mt-1">Buat dan kelola voucher yang bisa ditukar dengan poin</p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-6 py-3 rounded-xl font-medium hover:from-blue-600 hover:to-purple-700 transition-all duration-300 shadow-lg hover:shadow-xl active:scale-95"
        >
          + Tambah Voucher
        </button>
      </div>

      {/* Filter */}
      <div className="mb-6 flex gap-3">
        <button
          onClick={() => setActiveFilter('all')}
          className={`px-4 py-2 rounded-lg font-medium transition-all ${
            activeFilter === 'all'
              ? 'bg-blue-500 text-white shadow-md'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Semua
        </button>
        <button
          onClick={() => setActiveFilter('active')}
          className={`px-4 py-2 rounded-lg font-medium transition-all ${
            activeFilter === 'active'
              ? 'bg-green-500 text-white shadow-md'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Aktif
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex justify-center items-center py-20">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-gray-200 border-t-blue-500"></div>
        </div>
      ) : vouchers.length === 0 ? (
        <div className="text-center py-20 text-gray-500">
          <p className="text-xl font-medium mb-2">Belum ada voucher.</p>
          <p className="text-gray-400">Klik tombol "Tambah Voucher" untuk membuat voucher baru.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {vouchers.map((voucher) => (
            <div
              key={voucher.id}
              className="border-2 border-gray-200 rounded-xl p-5 hover:shadow-xl transition-all duration-300 bg-white"
            >
              <div className="flex justify-between items-start mb-3">
                <div className="flex-1">
                  <h3 className="font-bold text-lg text-gray-800 mb-1">{voucher.name}</h3>
                  <p className="text-sm text-gray-600 mb-2 line-clamp-2">{voucher.description}</p>
                </div>
                {voucher.is_active ? (
                  <span className="bg-green-100 text-green-700 px-2 py-1 rounded-md text-xs font-medium shrink-0">
                    Aktif
                  </span>
                ) : (
                  <span className="bg-gray-200 text-gray-600 px-2 py-1 rounded-md text-xs font-medium shrink-0">
                    Nonaktif
                  </span>
                )}
              </div>

              <div className="space-y-2 mb-4">
                <div className="flex items-center gap-2">
                  <span className="text-blue-600 font-bold">{voucher.points_required} Poin</span>
                </div>
                <div className="flex items-center gap-2">
                  {voucher.discount_type === 'percentage' ? (
                    <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-medium">
                      {voucher.discount_value}% OFF
                    </span>
                  ) : (
                    <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-medium">
                      {formatRupiah(voucher.discount_value)} OFF
                    </span>
                  )}
                </div>
                {voucher.min_order_amount > 0 && (
                  <div className="text-xs text-gray-500">
                    Min. pembelian: {formatRupiah(voucher.min_order_amount)}
                  </div>
                )}
                <div className="flex items-center gap-4 text-xs text-gray-500">
                  <span>Berlaku {voucher.valid_days} hari</span>
                  {voucher.stock_quantity && (
                    <span>Stok: {voucher.stock_quantity - voucher.redeemed_count}</span>
                  )}
                </div>
                <div className="text-xs text-gray-500">
                  Ditukar: {voucher.redeemed_count || 0} kali
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => handleOpenModal(voucher)}
                  className="flex-1 bg-blue-500 text-white py-2 px-4 rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(voucher.id, voucher.name)}
                  className="flex-1 bg-red-500 text-white py-2 px-4 rounded-lg text-sm font-medium hover:bg-red-600 transition-colors"
                >
                  Hapus
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4"
          onClick={handleCloseModal}
        >
          <div
            className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-gradient-to-r from-blue-500 to-purple-600 text-white p-6 rounded-t-2xl">
              <h2 className="text-2xl font-bold">
                {editingVoucher ? 'Edit Voucher' : 'Tambah Voucher Baru'}
              </h2>
            </div>

            <form onSubmit={handleSubmit} className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Nama */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nama Voucher <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Contoh: Diskon 10% untuk Member Setia"
                    required
                  />
                </div>

                {/* Deskripsi */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Deskripsi
                  </label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    rows="3"
                    className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Deskripsikan voucher ini..."
                  />
                </div>

                {/* Poin Required */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Poin Diperlukan <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    name="points_required"
                    value={formData.points_required}
                    onChange={handleInputChange}
                    className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="10"
                    min="1"
                    required
                  />
                </div>

                {/* Tipe Diskon */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tipe Diskon <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="discount_type"
                    value={formData.discount_type}
                    onChange={handleInputChange}
                    className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="percentage">Persentase (%)</option>
                    <option value="fixed_amount">Jumlah Tetap (Rp)</option>
                  </select>
                </div>

                {/* Nilai Diskon */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nilai Diskon <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    name="discount_value"
                    value={formData.discount_value}
                    onChange={handleInputChange}
                    className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder={formData.discount_type === 'percentage' ? '10' : '15000'}
                    min="1"
                    step="0.01"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {formData.discount_type === 'percentage' ? 'Contoh: 10 untuk 10%' : 'Contoh: 15000 untuk Rp 15.000'}
                  </p>
                </div>

                {/* Min Order Amount */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Minimal Pembelian (Rp)
                  </label>
                  <input
                    type="number"
                    name="min_order_amount"
                    value={formData.min_order_amount}
                    onChange={handleInputChange}
                    className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="0"
                    min="0"
                  />
                </div>

                {/* Max Discount Amount */}
                {formData.discount_type === 'percentage' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Maks. Potongan (Rp)
                    </label>
                    <input
                      type="number"
                      name="max_discount_amount"
                      value={formData.max_discount_amount}
                      onChange={handleInputChange}
                      className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Kosongkan jika tidak ada batas"
                      min="0"
                    />
                  </div>
                )}

                {/* Valid Days */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Berlaku Berapa Hari
                  </label>
                  <input
                    type="number"
                    name="valid_days"
                    value={formData.valid_days}
                    onChange={handleInputChange}
                    className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="30"
                    min="1"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Voucher berlaku selama X hari setelah ditukar
                  </p>
                </div>

                {/* Stock Quantity */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Stok Voucher
                  </label>
                  <input
                    type="number"
                    name="stock_quantity"
                    value={formData.stock_quantity}
                    onChange={handleInputChange}
                    className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Kosongkan jika unlimited"
                    min="1"
                  />
                </div>

                {/* Max Redeem Per User */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Maks. Redeem per Customer
                  </label>
                  <input
                    type="number"
                    name="max_redeem_per_user"
                    value={formData.max_redeem_per_user}
                    onChange={handleInputChange}
                    className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="1"
                    min="1"
                  />
                </div>

                {/* Is Active */}
                <div className="md:col-span-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      name="is_active"
                      checked={formData.is_active}
                      onChange={handleInputChange}
                      className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm font-medium text-gray-700">Voucher Aktif</span>
                  </label>
                </div>
              </div>

              {/* Buttons */}
              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="flex-1 bg-gray-200 text-gray-700 py-3 px-4 rounded-xl font-medium hover:bg-gray-300 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-gradient-to-r from-blue-500 to-purple-600 text-white py-3 px-4 rounded-xl font-medium hover:from-blue-600 hover:to-purple-700 transition-all duration-300 shadow-lg hover:shadow-xl"
                >
                  {editingVoucher ? 'Perbarui' : 'Simpan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirm Dialog */}
      <ConfirmDialog
        isOpen={deleteDialog.isOpen}
        title="Hapus Voucher?"
        message={`Apakah Anda yakin ingin menghapus voucher "${deleteDialog.voucherName}"? Voucher akan dihapus dari daftar dan tidak bisa ditukar lagi oleh customer.`}
        confirmText="Hapus"
        cancelText="Batal"
        onConfirm={confirmDeleteVoucher}
        onClose={() => setDeleteDialog({ isOpen: false, voucherId: null, voucherName: '' })}
        type="danger"
      />
      </div>
    </AdminLayout>
  );
};

export default VoucherRewards;
