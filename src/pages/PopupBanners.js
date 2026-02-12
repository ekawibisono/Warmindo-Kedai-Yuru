import React, { useState, useEffect } from 'react';
import AdminLayout from '../components/admin/AdminLayout';
import { staffAPI } from '../services/api';
import ConfirmDialog from '../components/common/ConfirmDialog';
import { notify } from '../components/common/Toast';

const PopupBanners = () => {
  const [banners, setBanners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingBanner, setEditingBanner] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    image_url: '',
    is_active: false,
    show_frequency: 'once_per_session',
    button_text: 'Tutup',
    button_action: 'close',
    redirect_url: '',
    display_duration: 0
  });
  const [imageError, setImageError] = useState({});
  const [formErrors, setFormErrors] = useState({});
  const [deleteDialog, setDeleteDialog] = useState({
    isOpen: false,
    id: null,
    title: ''
  });

  useEffect(() => {
    fetchBanners();
  }, []);

  const validateForm = () => {
    const errors = {};
    
    if (!formData.title.trim()) {
      errors.title = 'Title wajib diisi';
    }
    
    if (formData.image_url && !isValidUrl(formData.image_url)) {
      errors.image_url = 'URL gambar tidak valid';
    }
    
    if (formData.button_action === 'redirect' && !formData.redirect_url.trim()) {
      errors.redirect_url = 'Redirect URL wajib diisi untuk aksi redirect';
    }
    
    if (formData.redirect_url && !isValidUrl(formData.redirect_url)) {
      errors.redirect_url = 'Redirect URL tidak valid';
    }

    if (formData.display_duration < 0) {
      errors.display_duration = 'Durasi tidak boleh negatif';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const isValidUrl = (string) => {
    try {
      new URL(string);
      return true;
    } catch (_) {
      return false;
    }
  };

  const handleImageError = (bannerId) => {
    setImageError(prev => ({ ...prev, [bannerId]: true }));
  };

  const handleImageLoad = (bannerId) => {
    setImageError(prev => ({ ...prev, [bannerId]: false }));
  };

  const fetchBanners = async () => {
    try {
      setLoading(true);
      const response = await staffAPI.getPopupBanners();
      setBanners(response.data);
    } catch (error) {
      notify.error('Gagal memuat popup banners');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      notify.error('Mohon perbaiki kesalahan pada form');
      return;
    }
    
    try {
      if (editingBanner) {
        await staffAPI.updatePopupBanner(editingBanner.id, formData);
        notify.success('✅ Popup banner berhasil diperbarui');
      } else {
        await staffAPI.createPopupBanner(formData);
        notify.success('✅ Popup banner berhasil dibuat');
      }
      
      await fetchBanners();
      handleCloseForm();
    } catch (error) {
      notify.error(`Gagal ${editingBanner ? 'memperbarui' : 'membuat'} popup banner`);
      console.error(error);
    }
  };

  const handleToggle = async (id) => {
    try {
      await staffAPI.togglePopupBanner(id);
      notify.success('Status popup banner berhasil diubah');
      await fetchBanners();
    } catch (error) {
      notify.error('Gagal mengubah status popup banner');
      console.error(error);
    }
  };

  const confirmDelete = (id, title) => {
    setDeleteDialog({
      isOpen: true,
      id: id,
      title: title
    });
  };

  const handleDelete = async () => {
    try {
      await staffAPI.deletePopupBanner(deleteDialog.id);
      notify.success('Popup banner berhasil dihapus');
      await fetchBanners();
      setDeleteDialog({ isOpen: false, id: null, title: '' });
    } catch (error) {
      notify.error('Gagal menghapus popup banner');
      console.error(error);
    }
  };

  const handleEdit = (banner) => {
    setEditingBanner(banner);
    setFormData({
      title: banner.title || '',
      description: banner.description || '',
      image_url: banner.image_url || '',
      is_active: banner.is_active || false,
      show_frequency: banner.show_frequency || 'once_per_session',
      button_text: banner.button_text || 'Tutup',
      button_action: banner.button_action || 'close',
      redirect_url: banner.redirect_url || '',
      display_duration: banner.display_duration || 0
    });
    setShowModal(true);
  };

  const handleCloseForm = () => {
    setShowModal(false);
    setEditingBanner(null);
    setFormErrors({});
    setFormData({
      title: '',
      description: '',
      image_url: '',
      is_active: false,
      show_frequency: 'once_per_session',
      button_text: 'Tutup',
      button_action: 'close',
      redirect_url: '',
      display_duration: 0
    });
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('id-ID', {
      dateStyle: 'medium',
      timeStyle: 'short'
    });
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-white rounded-lg shadow border border-gray-200 p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-2">
                🎨 Popup Banner Management
              </h1>
              <p className="text-sm sm:text-base text-gray-600 mt-1">
                Kelola popup banner yang ditampilkan saat customer mengunjungi website
              </p>
            </div>
            <button
              onClick={() => setShowModal(true)}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center gap-2 shadow-md hover:shadow-lg"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Tambah Banner
            </button>
          </div>
        </div>

        {/* Banner List */}
        <div className="bg-white rounded-lg shadow border border-gray-200">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : banners.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Belum ada popup banner</h3>
              <p className="text-gray-500 mb-6">Buat popup banner pertama untuk menyambut customer</p>
              <button
                onClick={() => setShowModal(true)}
                className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
              >
                Buat Banner Pertama
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left py-4 px-6 text-sm font-semibold text-gray-900">Preview</th>
                    <th className="text-left py-4 px-6 text-sm font-semibold text-gray-900">Detail Banner</th>
                    <th className="text-left py-4 px-6 text-sm font-semibold text-gray-900">Status</th>
                    <th className="text-left py-4 px-6 text-sm font-semibold text-gray-900">Frequency</th>
                    <th className="text-left py-4 px-6 text-sm font-semibold text-gray-900">Created</th>
                    <th className="text-left py-4 px-6 text-sm font-semibold text-gray-900">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {banners.map((banner, index) => (
                    <tr key={banner.id} className={`border-b border-gray-100 hover:bg-gray-50 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-25'}`}>
                      <td className="py-4 px-6">
                        <div className="w-16 h-12 bg-gray-100 rounded-lg overflow-hidden shadow-sm border border-gray-200">
                          {banner.image_url && !imageError[banner.id] ? (
                            <img 
                              src={banner.image_url} 
                              alt={banner.title}
                              className="w-full h-full object-cover"
                              onError={() => handleImageError(banner.id)}
                              onLoad={() => handleImageLoad(banner.id)}
                              loading="lazy"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <div className="max-w-xs">
                          <h3 className="font-semibold text-gray-900 mb-1 line-clamp-1">{banner.title}</h3>
                          {banner.description && (
                            <p className="text-sm text-gray-600 line-clamp-2 mb-2">{banner.description}</p>
                          )}
                          <div className="flex items-center gap-4 text-xs text-gray-500">
                            <span className="flex items-center gap-1">
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                              </svg>
                              {banner.button_text}
                            </span>
                            {banner.display_duration > 0 && (
                              <span className="flex items-center gap-1">
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                {banner.display_duration}s
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <button
                          onClick={() => handleToggle(banner.id)}
                          className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                            banner.is_active 
                              ? 'bg-green-100 text-green-800 hover:bg-green-200' 
                              : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                          }`}
                        >
                          <span className={`w-2 h-2 rounded-full mr-2 ${
                            banner.is_active ? 'bg-green-500' : 'bg-gray-400'
                          }`}></span>
                          {banner.is_active ? 'Aktif' : 'Nonaktif'}
                        </button>
                      </td>
                      <td className="py-4 px-6">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          banner.show_frequency === 'always' 
                            ? 'bg-red-100 text-red-800' 
                            : banner.show_frequency === 'once_per_day'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-green-100 text-green-800'
                        }`}>
                          {banner.show_frequency === 'once_per_session' && 'Sekali per sesi'}
                          {banner.show_frequency === 'once_per_day' && 'Sekali per hari'}
                          {banner.show_frequency === 'always' && 'Selalu tampil'}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <span className="text-sm text-gray-500">{formatDate(banner.created_at)}</span>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleEdit(banner)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                            title="Edit"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => confirmDelete(banner.id, banner.title)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors"
                            title="Hapus"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Create/Edit Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl max-w-2xl w-full mx-4 p-4 sm:p-6 max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-900">
                  {editingBanner ? 'Edit Popup Banner' : 'Tambah Popup Banner'}
                </h2>
                <button
                  onClick={handleCloseForm}
                  className="text-gray-400 hover:text-gray-600 p-1"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Title */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) => setFormData({...formData, title: e.target.value})}
                    className={`w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      formErrors.title ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Contoh: Selamat Datang di Kedai Yuru"
                  />
                  {formErrors.title && (
                    <p className="mt-1 text-sm text-red-600">{formErrors.title}</p>
                  )}
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    rows="3"
                    placeholder="Deskripsi singkat tentang promo atau informasi"
                  />
                </div>

                {/* Image URL */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Image URL</label>
                  <input
                    type="url"
                    value={formData.image_url}
                    onChange={(e) => setFormData({...formData, image_url: e.target.value})}
                    className={`w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      formErrors.image_url ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="https://example.com/image.jpg"
                  />
                  {formErrors.image_url && (
                    <p className="mt-1 text-sm text-red-600">{formErrors.image_url}</p>
                  )}
                </div>

                {/* Show Frequency */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Frekuensi Tampil</label>
                  <select
                    value={formData.show_frequency}
                    onChange={(e) => setFormData({...formData, show_frequency: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="once_per_session">Sekali per sesi</option>
                    <option value="once_per_day">Sekali per hari</option>
                    <option value="always">Selalu tampil</option>
                  </select>
                </div>

                {/* Button Config */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Text Button</label>
                    <input
                      type="text"
                      value={formData.button_text}
                      onChange={(e) => setFormData({...formData, button_text: e.target.value})}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Tutup"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Button Action</label>
                    <select
                      value={formData.button_action}
                      onChange={(e) => setFormData({...formData, button_action: e.target.value})}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="close">Tutup saja</option>
                      <option value="redirect">Redirect ke URL</option>
                    </select>
                  </div>
                </div>

                {/* Redirect URL (conditional) */}
                {formData.button_action === 'redirect' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Redirect URL</label>
                    <input
                      type="url"
                      value={formData.redirect_url}
                      onChange={(e) => setFormData({...formData, redirect_url: e.target.value})}
                      className={`w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                        formErrors.redirect_url ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="https://example.com/promo"
                    />
                    {formErrors.redirect_url && (
                      <p className="mt-1 text-sm text-red-600">{formErrors.redirect_url}</p>
                    )}
                  </div>
                )}

                {/* Display Duration */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Auto Close (detik)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.display_duration}
                    onChange={(e) => setFormData({...formData, display_duration: parseInt(e.target.value) || 0})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="0 (manual close)"
                  />
                  <p className="text-xs text-gray-500 mt-1">0 = manual close, {'>'}0 = auto close setelah N detik</p>
                </div>

                {/* Active Status */}
                <div className="flex items-center">
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.is_active}
                      onChange={(e) => setFormData({...formData, is_active: e.target.checked})}
                      className="mr-2 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm font-medium text-gray-700">Aktifkan sekarang</span>
                  </label>
                  <p className="text-xs text-gray-500 ml-2">(Banner lain akan otomatis dinonaktifkan)</p>
                </div>
                {/* Form Actions */}
                <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={handleCloseForm}
                    className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    {editingBanner ? 'Perbarui' : 'Buat'} Banner
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Confirm Delete Dialog */}
        <ConfirmDialog
          isOpen={deleteDialog.isOpen}
          title="Hapus Popup Banner"
          message={`Apakah Anda yakin ingin menghapus banner "${deleteDialog.title}"? Tindakan ini tidak dapat dibatalkan.`}
          onConfirm={handleDelete}
          onClose={() => setDeleteDialog({ isOpen: false, id: null, title: '' })}
          confirmText="Hapus"
          cancelText="Batal"
          type="danger"
        />
      </div>
    </AdminLayout>
  );
};

export default PopupBanners;