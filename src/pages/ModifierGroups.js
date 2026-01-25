import React, { useState, useEffect } from 'react';
import AdminLayout from '../components/admin/AdminLayout';
import { staffAPI } from '../services/api';
import ConfirmDialog from '../components/common/ConfirmDialog';
import { notify } from '../components/common/Toast';

const ModifierGroups = () => {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingGroup, setEditingGroup] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    selection_type: 'single',
    is_required: false,
    min_select: 0,
    max_select: 1,
    is_active: true,
  });

  // State untuk confirm dialog
  const [deleteDialog, setDeleteDialog] = useState({
    isOpen: false,
    id: null,
    name: ''
  });

  useEffect(() => {
    fetchGroups();
  }, []);

  const fetchGroups = async () => {
    try {
      const response = await staffAPI.getModifierGroups();
      setGroups(response.data);
    } catch (error) {
      console.error('Error fetching modifier groups:', error);
      notify.error('Gagal memuat data modifier groups');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const payload = {
      ...formData,
      min_select: parseInt(formData.min_select),
      max_select: parseInt(formData.max_select),
    };

    try {
      if (editingGroup) {
        await staffAPI.updateModifierGroup(editingGroup.id, payload);
        notify.success(`Modifier group "${formData.name}" berhasil diupdate`);
      } else {
        await staffAPI.createModifierGroup(payload);
        notify.success(`Modifier group "${formData.name}" berhasil ditambahkan`);
      }
      
      fetchGroups();
      handleCloseModal();
    } catch (error) {
      console.error('Error saving modifier group:', error);
      notify.error(error.response?.data?.message || 'Gagal menyimpan modifier group');
    }
  };

  const handleEdit = (group) => {
    setEditingGroup(group);
    setFormData({
      name: group.name,
      selection_type: group.selection_type,
      is_required: group.is_required,
      min_select: group.min_select,
      max_select: group.max_select,
      is_active: group.is_active,
    });
    setShowModal(true);
  };

  const openDeleteDialog = (group) => {
    setDeleteDialog({
      isOpen: true,
      id: group.id,
      name: group.name
    });
  };

  const closeDeleteDialog = () => {
    setDeleteDialog({ isOpen: false, id: null, name: '' });
  };

  const handleDelete = async () => {
    try {
      await staffAPI.deleteModifierGroup(deleteDialog.id);
      notify.success(`Modifier group "${deleteDialog.name}" berhasil dihapus`);
      fetchGroups();
      closeDeleteDialog();
    } catch (error) {
      console.error('Error deleting modifier group:', error);
      notify.error(error.response?.data?.message || 'Gagal menghapus modifier group');
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingGroup(null);
    setFormData({
      name: '',
      selection_type: 'single',
      is_required: false,
      min_select: 0,
      max_select: 1,
      is_active: true,
    });
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
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Modifier Groups</h1>
            <p className="text-gray-600 mt-2">Kelola grup modifier untuk produk</p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="btn-primary flex items-center"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Tambah Group
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {groups.map((group) => (
            <div key={group.id} className="card">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{group.name}</h3>
                  <p className="text-sm text-gray-500 mt-1">
                    {group.selection_type === 'single' ? 'Single Selection' : 'Multiple Selection'}
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleEdit(group)}
                    className="text-primary-600 hover:text-primary-900"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => openDeleteDialog(group)}
                    className="text-red-600 hover:text-red-900"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Required:</span>
                  <span className={group.is_required ? 'text-green-600 font-medium' : 'text-gray-400'}>
                    {group.is_required ? 'Yes' : 'No'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Min Select:</span>
                  <span className="font-medium">{group.min_select}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Max Select:</span>
                  <span className="font-medium">{group.max_select}</span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t">
                  <span className="text-gray-600">Status:</span>
                  {group.is_active ? (
                    <span className="badge-success">Aktif</span>
                  ) : (
                    <span className="badge-gray">Nonaktif</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-lg w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900">
                {editingGroup ? 'Edit Modifier Group' : 'Tambah Modifier Group'}
              </h2>
              <button
                onClick={handleCloseModal}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nama Group *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="input-field"
                  placeholder="e.g., Size, Topping"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Selection Type *
                </label>
                <select
                  value={formData.selection_type}
                  onChange={(e) => setFormData({ ...formData, selection_type: e.target.value })}
                  className="input-field"
                >
                  <option value="single">Single (Pilih 1)</option>
                  <option value="multiple">Multiple (Pilih banyak)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Min Select
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.min_select}
                    onChange={(e) => setFormData({ ...formData, min_select: e.target.value })}
                    className="input-field"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Max Select
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formData.max_select}
                    onChange={(e) => setFormData({ ...formData, max_select: e.target.value })}
                    className="input-field"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="is_required"
                    checked={formData.is_required}
                    onChange={(e) => setFormData({ ...formData, is_required: e.target.checked })}
                    className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                  />
                  <label htmlFor="is_required" className="ml-2 block text-sm text-gray-900">
                    Wajib dipilih (Required)
                  </label>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="is_active"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                  />
                  <label htmlFor="is_active" className="ml-2 block text-sm text-gray-900">
                    Aktif
                  </label>
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="btn-secondary"
                >
                  Batal
                </button>
                <button type="submit" className="btn-primary">
                  {editingGroup ? 'Update' : 'Simpan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirm Dialog */}
      <ConfirmDialog
        isOpen={deleteDialog.isOpen}
        onClose={closeDeleteDialog}
        onConfirm={handleDelete}
        title="Hapus Modifier Group?"
        message={`Apakah Anda yakin ingin menghapus modifier group "${deleteDialog.name}"? Tindakan ini tidak dapat dibatalkan.`}
        confirmText="Ya, Hapus"
        cancelText="Batal"
        type="danger"
      />
    </AdminLayout>
  );
};

export default ModifierGroups;