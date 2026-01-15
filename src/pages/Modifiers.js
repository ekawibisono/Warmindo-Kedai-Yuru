import React, { useState, useEffect } from 'react';
import AdminLayout from '../components/admin/AdminLayout';
import { staffAPI } from '../services/api';
import ConfirmDialog from '../components/common/ConfirmDialog';
import notify from '../components/common/Toast';

const Modifiers = () => {
  const [modifiers, setModifiers] = useState([]);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingModifier, setEditingModifier] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    group_id: '',
    price_delta: 0,
    is_active: true,
  });

  // State untuk confirm dialog
  const [deleteDialog, setDeleteDialog] = useState({
    isOpen: false,
    id: null,
    name: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [modifiersRes, groupsRes] = await Promise.all([
        staffAPI.getModifiers(),
        staffAPI.getModifierGroups(),
      ]);
      setModifiers(modifiersRes.data);
      setGroups(groupsRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
      notify.error('Gagal memuat data modifiers');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const payload = {
      ...formData,
      price_delta: parseFloat(formData.price_delta),
    };

    try {
      if (editingModifier) {
        await staffAPI.updateModifier(editingModifier.id, payload);
        notify.success(`Modifier "${formData.name}" berhasil diupdate`);
      } else {
        await staffAPI.createModifier(payload);
        notify.success(`Modifier "${formData.name}" berhasil ditambahkan`);
      }
      
      fetchData();
      handleCloseModal();
    } catch (error) {
      console.error('Error saving modifier:', error);
      notify.error(error.response?.data?.message || 'Gagal menyimpan modifier');
    }
  };

  const openDeleteDialog = (modifier) => {
    setDeleteDialog({
      isOpen: true,
      id: modifier.id,
      name: modifier.name
    });
  };

  const closeDeleteDialog = () => {
    setDeleteDialog({ isOpen: false, id: null, name: '' });
  };

  const handleDelete = async () => {
    try {
      await staffAPI.deleteModifier(deleteDialog.id);
      notify.success(`Modifier "${deleteDialog.name}" berhasil dihapus`);
      fetchData();
      closeDeleteDialog();
    } catch (error) {
      console.error('Error deleting modifier:', error);
      notify.error(error.response?.data?.message || 'Gagal menghapus modifier');
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingModifier(null);
    setFormData({ name: '', group_id: '', price_delta: 0, is_active: true });
  };

  const getGroupName = (groupId) => {
    const group = groups.find(g => g.id === groupId);
    return group ? group.name : '-';
  };

  const formatRupiah = (number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(number);
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
            <h1 className="text-3xl font-bold text-gray-900">Modifiers</h1>
            <p className="text-gray-600 mt-2">Kelola modifier untuk produk</p>
          </div>
          <button onClick={() => setShowModal(true)} className="btn-primary flex items-center">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Tambah Modifier
          </button>
        </div>

        <div className="card overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nama</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Group</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Price Delta</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Aksi</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {modifiers.map((modifier) => (
                <tr key={modifier.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{modifier.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{getGroupName(modifier.group_id)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatRupiah(modifier.price_delta)}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {modifier.is_active ? <span className="badge-success">Aktif</span> : <span className="badge-gray">Nonaktif</span>}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button 
                      onClick={() => { 
                        setEditingModifier(modifier); 
                        setFormData({...modifier}); 
                        setShowModal(true); 
                      }} 
                      className="text-primary-600 hover:text-primary-900 mr-4"
                    >
                      Edit
                    </button>
                    <button 
                      onClick={() => openDeleteDialog(modifier)} 
                      className="text-red-600 hover:text-red-900"
                    >
                      Hapus
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900">
                {editingModifier ? 'Edit Modifier' : 'Tambah Modifier'}
              </h2>
              <button onClick={handleCloseModal} className="text-gray-400 hover:text-gray-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Nama *</label>
                <input 
                  type="text" 
                  required 
                  value={formData.name} 
                  onChange={(e) => setFormData({...formData, name: e.target.value})} 
                  className="input-field"
                  placeholder="Masukkan nama modifier" 
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Group *</label>
                <select 
                  required 
                  value={formData.group_id} 
                  onChange={(e) => setFormData({...formData, group_id: e.target.value})} 
                  className="input-field"
                >
                  <option value="">Pilih group</option>
                  {groups.map(g => (
                    <option key={g.id} value={g.id}>{g.name}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Price Delta</label>
                <input 
                  type="number" 
                  step="0.01" 
                  value={formData.price_delta} 
                  onChange={(e) => setFormData({...formData, price_delta: e.target.value})} 
                  className="input-field"
                  placeholder="0" 
                />
              </div>
              
              <div className="flex items-center">
                <input 
                  type="checkbox" 
                  id="is_active" 
                  checked={formData.is_active} 
                  onChange={(e) => setFormData({...formData, is_active: e.target.checked})} 
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded" 
                />
                <label htmlFor="is_active" className="ml-2 block text-sm text-gray-900">Aktif</label>
              </div>
              
              <div className="flex justify-end space-x-3 pt-4 border-t">
                <button type="button" onClick={handleCloseModal} className="btn-secondary">Batal</button>
                <button type="submit" className="btn-primary">{editingModifier ? 'Update' : 'Simpan'}</button>
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
        title="Hapus Modifier?"
        message={`Apakah Anda yakin ingin menghapus modifier "${deleteDialog.name}"? Tindakan ini tidak dapat dibatalkan.`}
        confirmText="Ya, Hapus"
        cancelText="Batal"
        type="danger"
      />
    </AdminLayout>
  );
};

export default Modifiers;