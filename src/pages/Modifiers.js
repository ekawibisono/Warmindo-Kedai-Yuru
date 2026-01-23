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
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [editingModifier, setEditingModifier] = useState(null);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [formData, setFormData] = useState({
    name: '',
    group_id: '',
    price_delta: 0,
    is_active: true,
  });

  // State untuk bulk add modifiers
  const [bulkFormData, setBulkFormData] = useState({
    group_id: '',
    modifiers: [{ name: '', price_delta: 0 }],
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

  const handleBulkSubmit = async (e) => {
    e.preventDefault();
    
    const validModifiers = bulkFormData.modifiers.filter(mod => mod.name.trim() !== '');
    
    if (validModifiers.length === 0) {
      notify.error('Masukkan minimal satu nama modifier');
      return;
    }

    try {
      const promises = validModifiers.map(modifier => 
        staffAPI.createModifier({
          name: modifier.name.trim(),
          group_id: bulkFormData.group_id,
          price_delta: parseFloat(modifier.price_delta),
          is_active: bulkFormData.is_active,
        })
      );

      await Promise.all(promises);
      notify.success(`${validModifiers.length} modifier berhasil ditambahkan`);
      fetchData();
      handleCloseBulkModal();
    } catch (error) {
      console.error('Error saving bulk modifiers:', error);
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

  const handleCloseBulkModal = () => {
    setShowBulkModal(false);
    setBulkFormData({
      group_id: '',
      modifiers: [{ name: '', price_delta: 0 }],
      is_active: true,
    });
  };

  const addModifierInput = () => {
    setBulkFormData(prev => ({
      ...prev,
      modifiers: [...prev.modifiers, { name: '', price_delta: 0 }]
    }));
  };

  const removeModifierInput = (index) => {
    setBulkFormData(prev => ({
      ...prev,
      modifiers: prev.modifiers.filter((_, i) => i !== index)
    }));
  };

  const updateModifierName = (index, value) => {
    setBulkFormData(prev => ({
      ...prev,
      modifiers: prev.modifiers.map((mod, i) => 
        i === index ? { ...mod, name: value } : mod
      )
    }));
  };

  const updateModifierPrice = (index, value) => {
    setBulkFormData(prev => ({
      ...prev,
      modifiers: prev.modifiers.map((mod, i) => 
        i === index ? { ...mod, price_delta: value } : mod
      )
    }));
  };

  const getGroupName = (groupId) => {
    const group = groups.find(g => g.id === groupId);
    return group ? group.name : '-';
  };

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const getSortedModifiers = () => {
    if (!sortConfig.key) return modifiers;

    return [...modifiers].sort((a, b) => {
      let aValue, bValue;

      if (sortConfig.key === 'group') {
        aValue = getGroupName(a.group_id).toLowerCase();
        bValue = getGroupName(b.group_id).toLowerCase();
      } else if (sortConfig.key === 'name') {
        aValue = a.name.toLowerCase();
        bValue = b.name.toLowerCase();
      } else {
        aValue = a[sortConfig.key];
        bValue = b[sortConfig.key];
      }

      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  };

  const getSortIcon = (columnKey) => {
    if (sortConfig.key !== columnKey) {
      return (
        <svg className="w-4 h-4 ml-1 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
        </svg>
      );
    }
    
    if (sortConfig.direction === 'asc') {
      return (
        <svg className="w-4 h-4 ml-1 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
        </svg>
      );
    } else {
      return (
        <svg className="w-4 h-4 ml-1 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      );
    }
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
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-4 sm:space-y-0">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Modifiers</h1>
            <p className="text-gray-600 mt-1 sm:mt-2 text-sm sm:text-base">Kelola modifier untuk produk</p>
          </div>
          <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
            <button onClick={() => setShowBulkModal(true)} className="btn-secondary flex items-center justify-center w-full sm:w-auto">
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14v6m-3-3h6m-6-3h6m-9-1V4a2 2 0 00-2-2H5a2 2 0 00-2 2v14a2 2 0 002 2h6m2-6V8" />
              </svg>
              <span className="sm:inline">Tambah Multiple</span>
            </button>
            <button onClick={() => setShowModal(true)} className="btn-primary flex items-center justify-center w-full sm:w-auto">
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span className="sm:inline">Tambah Modifier</span>
            </button>
          </div>
        </div>

        {/* Desktop & Tablet Table View */}
        <div className="hidden md:block card overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100 select-none"
                  onClick={() => handleSort('name')}
                >
                  <div className="flex items-center">
                    Nama
                    {getSortIcon('name')}
                  </div>
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100 select-none"
                  onClick={() => handleSort('group')}
                >
                  <div className="flex items-center">
                    Group
                    {getSortIcon('group')}
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Price Delta</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Aksi</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {getSortedModifiers().map((modifier) => (
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

        {/* Mobile Card View */}
        <div className="md:hidden space-y-4">
          {/* Mobile Sort Controls */}
          <div className="flex space-x-2 overflow-x-auto pb-2">
            <button
              onClick={() => handleSort('name')}
              className={`flex items-center px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap ${
                sortConfig.key === 'name' 
                  ? 'bg-primary-100 text-primary-700 border border-primary-200' 
                  : 'bg-white text-gray-600 border border-gray-200'
              }`}
            >
              Nama {getSortIcon('name')}
            </button>
            <button
              onClick={() => handleSort('group')}
              className={`flex items-center px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap ${
                sortConfig.key === 'group' 
                  ? 'bg-primary-100 text-primary-700 border border-primary-200' 
                  : 'bg-white text-gray-600 border border-gray-200'
              }`}
            >
              Group {getSortIcon('group')}
            </button>
          </div>

          {/* Mobile Cards */}
          <div className="space-y-3">
            {getSortedModifiers().map((modifier) => (
              <div key={modifier.id} className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">{modifier.name}</h3>
                    <p className="text-sm text-gray-500 mb-2">
                      <span className="inline-flex items-center">
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                        </svg>
                        {getGroupName(modifier.group_id)}
                      </span>
                    </p>
                  </div>
                  <div className="flex flex-col items-end">
                    {modifier.is_active ? 
                      <span className="badge-success mb-2">Aktif</span> : 
                      <span className="badge-gray mb-2">Nonaktif</span>
                    }
                  </div>
                </div>
                
                <div className="flex justify-between items-center">
                  <div className="text-lg font-semibold text-gray-900">
                    {formatRupiah(modifier.price_delta)}
                  </div>
                  <div className="flex space-x-2">
                    <button 
                      onClick={() => { 
                        setEditingModifier(modifier); 
                        setFormData({...modifier}); 
                        setShowModal(true); 
                      }} 
                      className="px-3 py-1.5 text-sm bg-primary-50 text-primary-600 rounded-md border border-primary-200 hover:bg-primary-100 transition-colors"
                    >
                      Edit
                    </button>
                    <button 
                      onClick={() => openDeleteDialog(modifier)} 
                      className="px-3 py-1.5 text-sm bg-red-50 text-red-600 rounded-md border border-red-200 hover:bg-red-100 transition-colors"
                    >
                      Hapus
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          {getSortedModifiers().length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
              <p className="text-sm">Belum ada modifier</p>
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full mx-4 p-4 sm:p-6 max-h-[90vh] overflow-y-auto">
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
              
              <div className="flex flex-col sm:flex-row sm:justify-end space-y-3 sm:space-y-0 sm:space-x-3 pt-4 border-t">
                <button type="button" onClick={handleCloseModal} className="btn-secondary w-full sm:w-auto order-2 sm:order-1">Batal</button>
                <button type="submit" className="btn-primary w-full sm:w-auto order-1 sm:order-2">{editingModifier ? 'Update' : 'Simpan'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk Modal */}
      {showBulkModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-lg w-full mx-4 p-4 sm:p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900">Tambah Multiple Modifier</h2>
              <button onClick={handleCloseBulkModal} className="text-gray-400 hover:text-gray-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <form onSubmit={handleBulkSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Group *</label>
                <select 
                  required 
                  value={bulkFormData.group_id} 
                  onChange={(e) => setBulkFormData({...bulkFormData, group_id: e.target.value})} 
                  className="input-field"
                >
                  <option value="">Pilih group</option>
                  {groups.map(g => (
                    <option key={g.id} value={g.id}>{g.name}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-sm font-medium text-gray-700">Modifiers *</label>
                  <button 
                    type="button" 
                    onClick={addModifierInput}
                    className="text-sm text-primary-600 hover:text-primary-800 flex items-center"
                  >
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Tambah Modifier
                  </button>
                </div>
                <div className="space-y-3">
                  {bulkFormData.modifiers.map((modifier, index) => (
                    <div key={index} className="border rounded-lg p-3 bg-gray-50">
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <h4 className="text-sm font-medium text-gray-700">Modifier {index + 1}</h4>
                          {bulkFormData.modifiers.length > 1 && (
                            <button 
                              type="button" 
                              onClick={() => removeModifierInput(index)}
                              className="text-red-500 hover:text-red-700 p-1 rounded-md hover:bg-red-50"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          )}
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Nama</label>
                            <input 
                              type="text" 
                              value={modifier.name} 
                              onChange={(e) => updateModifierName(index, e.target.value)}
                              className="input-field"
                              placeholder={`Modifier ${index + 1}`}
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Price Delta</label>
                            <input 
                              type="number" 
                              step="0.01" 
                              value={modifier.price_delta} 
                              onChange={(e) => updateModifierPrice(index, e.target.value)}
                              className="input-field"
                              placeholder="0"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="flex items-center">
                <input 
                  type="checkbox" 
                  id="bulk_is_active" 
                  checked={bulkFormData.is_active} 
                  onChange={(e) => setBulkFormData({...bulkFormData, is_active: e.target.checked})} 
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded" 
                />
                <label htmlFor="bulk_is_active" className="ml-2 block text-sm text-gray-900">Aktif (untuk semua)</label>
              </div>
              
              <div className="flex flex-col sm:flex-row sm:justify-end space-y-3 sm:space-y-0 sm:space-x-3 pt-4 border-t">
                <button type="button" onClick={handleCloseBulkModal} className="btn-secondary w-full sm:w-auto order-2 sm:order-1">Batal</button>
                <button type="submit" className="btn-primary w-full sm:w-auto order-1 sm:order-2">Simpan Semua</button>
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