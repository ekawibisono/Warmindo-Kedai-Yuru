import React, { useState, useEffect } from 'react';
import AdminLayout from '../components/admin/AdminLayout';
import ConfirmDialog from '../components/common/ConfirmDialog';
import { staffAPI } from '../services/api';
import notify from '../components/common/Toast';

const Products = () => {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [modifierGroups, setModifierGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showModifiersModal, setShowModifiersModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [managingProductModifiers, setManagingProductModifiers] = useState(null);
  const [productModifierGroups, setProductModifierGroups] = useState([]);
  const [selectedModifierGroups, setSelectedModifierGroups] = useState([]);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  
  const [deleteDialog, setDeleteDialog] = useState({
    isOpen: false,
    productId: null,
    productName: ''
  });
  
  const [formData, setFormData] = useState({
    name: '',
    price: '',
    category_id: '',
    sku: '',
    description: '',
    image_url: '',
    is_active: true,
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [productsRes, categoriesRes, modifierGroupsRes, productModifierGroupsRes] = await Promise.all([
        staffAPI.getProducts(),
        staffAPI.getCategories(),
        staffAPI.getModifierGroups(),
        staffAPI.getProductModifierGroups(),
      ]);
      setProducts(productsRes.data);
      setCategories(categoriesRes.data);
      setModifierGroups(modifierGroupsRes.data);
      setProductModifierGroups(productModifierGroupsRes.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      notify.error('Gagal memuat data produk');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const payload = {
      ...formData,
      price: parseFloat(formData.price),
      category_id: formData.category_id || null,
      sku: formData.sku || null,
      description: formData.description || null,
      image_url: formData.image_url || null,
    };

    try {
      if (editingProduct) {
        await staffAPI.updateProduct(editingProduct.id, payload);
        notify.success(`Produk "${formData.name}" berhasil diupdate`);
      } else {
        await staffAPI.createProduct(payload);
        notify.success(`Produk "${formData.name}" berhasil ditambahkan`);
      }
      
      fetchData();
      handleCloseModal();
    } catch (error) {
      console.error('Error saving product:', error);
      notify.error(error.response?.data?.message || 'Gagal menyimpan produk');
    }
  };

  const handleEdit = (product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      price: product.price.toString(),
      category_id: product.category_id || '',
      sku: product.sku || '',
      description: product.description || '',
      image_url: product.image_url || '',
      is_active: product.is_active,
    });
    setShowModal(true);
  };

  const openDeleteDialog = (product) => {
    setDeleteDialog({
      isOpen: true,
      productId: product.id,
      productName: product.name
    });
  };

  const closeDeleteDialog = () => {
    setDeleteDialog({
      isOpen: false,
      productId: null,
      productName: ''
    });
  };

  const handleDelete = async () => {
    try {
      await staffAPI.deleteProduct(deleteDialog.productId);
      notify.success(`Produk "${deleteDialog.productName}" berhasil dihapus`);
      fetchData();
      closeDeleteDialog();
    } catch (error) {
      console.error('Error deleting product:', error);
      notify.error(error.response?.data?.message || 'Gagal menghapus produk');
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingProduct(null);
    setFormData({
      name: '',
      price: '',
      category_id: '',
      sku: '',
      description: '',
      image_url: '',
      is_active: true,
    });
  };

  // Modifier Groups Management
  const openModifiersModal = (product) => {
    setManagingProductModifiers(product);
    
    // Get current modifier groups for this product
    const currentGroups = productModifierGroups
      .filter(pmg => pmg.product_id === product.id)
      .map(pmg => pmg.group_id);
    
    setSelectedModifierGroups(currentGroups);
    setShowModifiersModal(true);
  };

  const handleCloseModifiersModal = () => {
    setShowModifiersModal(false);
    setManagingProductModifiers(null);
    setSelectedModifierGroups([]);
  };

  const toggleModifierGroup = (groupId) => {
    setSelectedModifierGroups(prev => {
      if (prev.includes(groupId)) {
        return prev.filter(id => id !== groupId);
      } else {
        return [...prev, groupId];
      }
    });
  };

  const handleSaveModifiers = async () => {
    try {
      const productId = managingProductModifiers.id;
      
      // Get current modifier groups for this product
      const currentGroups = productModifierGroups
        .filter(pmg => pmg.product_id === productId)
        .map(pmg => pmg.group_id);
      
      // Determine groups to add and remove
      const groupsToAdd = selectedModifierGroups.filter(gid => !currentGroups.includes(gid));
      const groupsToRemove = currentGroups.filter(gid => !selectedModifierGroups.includes(gid));
      
      // Add new groups
      for (const groupId of groupsToAdd) {
        await staffAPI.addProductModifierGroup({ product_id: productId, group_id: groupId });
      }
      
      // Remove groups
      for (const groupId of groupsToRemove) {
        await staffAPI.removeProductModifierGroup({ product_id: productId, group_id: groupId });
      }
      
      notify.success(`Modifier groups untuk "${managingProductModifiers.name}" berhasil diupdate`);
      fetchData();
      handleCloseModifiersModal();
    } catch (error) {
      console.error('Error saving modifiers:', error);
      notify.error('Gagal menyimpan modifier groups');
    }
  };

  const getProductModifierGroups = (productId) => {
    return productModifierGroups
      .filter(pmg => pmg.product_id === productId)
      .map(pmg => {
        const group = modifierGroups.find(g => g.id === pmg.group_id);
        return group ? group.name : null;
      })
      .filter(Boolean);
  };

  const getCategoryName = (categoryId) => {
    const category = categories.find(c => c.id === categoryId);
    return category ? category.name : '-';
  };

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const getSortedProducts = () => {
    if (!sortConfig.key) return products;

    return [...products].sort((a, b) => {
      let aValue, bValue;

      if (sortConfig.key === 'category') {
        aValue = getCategoryName(a.category_id).toLowerCase();
        bValue = getCategoryName(b.category_id).toLowerCase();
      } else if (sortConfig.key === 'name') {
        aValue = a.name.toLowerCase();
        bValue = b.name.toLowerCase();
      } else if (sortConfig.key === 'price') {
        aValue = parseFloat(a.price) || 0;
        bValue = parseFloat(b.price) || 0;
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
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Produk</h1>
            <p className="text-gray-600 mt-1 sm:mt-2 text-sm sm:text-base">Kelola produk yang dijual</p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="btn-primary flex items-center justify-center w-full sm:w-auto"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Tambah Produk
          </button>
        </div>

        {/* Desktop & Tablet Table View */}
        <div className="hidden md:block card">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Produk
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Kategori
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Harga
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Terjual
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Modifiers
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Aksi
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {getSortedProducts().map((product) => {
                  const productModifiers = getProductModifierGroups(product.id);
                  return (
                    <tr key={product.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          {product.image_url ? (
                            <img
                              src={product.image_url}
                              alt={product.name}
                              className="h-10 w-10 rounded-lg object-cover mr-3"
                            />
                          ) : (
                            <div className="h-10 w-10 rounded-lg bg-gray-200 flex items-center justify-center mr-3">
                              <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                            </div>
                          )}
                          <div className="text-sm font-medium text-gray-900">{product.name}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{getCategoryName(product.category_id)}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{formatRupiah(product.price)}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <div className="flex flex-col items-center">
                          <span className={`text-sm font-bold ${
                            (product.total_sold || 0) > 0 ? 'text-green-600' : 'text-gray-400'
                          }`}>
                            {product.total_sold || 0}
                          </span>
                          <span className="text-xs text-gray-400">pcs</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1">
                          {productModifiers.length > 0 ? (
                            productModifiers.map((modName, idx) => (
                              <span key={idx} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                                {modName}
                              </span>
                            ))
                          ) : (
                            <span className="text-xs text-gray-400">Tidak ada</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {product.is_active ? (
                          <span className="badge-success">Aktif</span>
                        ) : (
                          <span className="badge-gray">Nonaktif</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => openModifiersModal(product)}
                          className="text-blue-600 hover:text-blue-900 mr-3"
                          title="Kelola Addons/Level"
                        >
                          <svg className="w-5 h-5 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleEdit(product)}
                          className="text-primary-600 hover:text-primary-900 mr-4"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => openDeleteDialog(product)}
                          className="text-red-600 hover:text-red-900"
                        >
                          Hapus
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
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
              onClick={() => handleSort('category')}
              className={`flex items-center px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap ${
                sortConfig.key === 'category' 
                  ? 'bg-primary-100 text-primary-700 border border-primary-200' 
                  : 'bg-white text-gray-600 border border-gray-200'
              }`}
            >
              Kategori {getSortIcon('category')}
            </button>
            <button
              onClick={() => handleSort('price')}
              className={`flex items-center px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap ${
                sortConfig.key === 'price' 
                  ? 'bg-primary-100 text-primary-700 border border-primary-200' 
                  : 'bg-white text-gray-600 border border-gray-200'
              }`}
            >
              Harga {getSortIcon('price')}
            </button>
          </div>

          {/* Mobile Product Cards */}
          <div className="space-y-4">
            {getSortedProducts().map((product) => {
              const productModifiers = getProductModifierGroups(product.id);
              return (
                <div key={product.id} className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
                  <div className="flex items-start space-x-3 mb-4">
                    {product.image_url ? (
                      <img
                        src={product.image_url}
                        alt={product.name}
                        className="h-16 w-16 rounded-lg object-cover flex-shrink-0"
                      />
                    ) : (
                      <div className="h-16 w-16 rounded-lg bg-gray-200 flex items-center justify-center flex-shrink-0">
                        <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start">
                        <h3 className="text-lg font-semibold text-gray-900 truncate pr-2">{product.name}</h3>
                        <div className="flex flex-col items-end">
                          {product.is_active ? 
                            <span className="badge-success mb-2">Aktif</span> : 
                            <span className="badge-gray mb-2">Nonaktif</span>
                          }
                        </div>
                      </div>
                      <div className="flex items-center text-sm text-gray-500 mb-2">
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                        </svg>
                        <span>{getCategoryName(product.category_id)}</span>
                        <span className="mx-2">•</span>
                        <span className={`font-medium ${
                          (product.total_sold || 0) > 0 ? 'text-green-600' : 'text-gray-400'
                        }`}>
                          {product.total_sold || 0} terjual
                        </span>
                      </div>
                      <div className="text-xl font-bold text-gray-900 mb-2">
                        {formatRupiah(product.price)}
                      </div>
                    </div>
                  </div>
                  
                  {/* Modifiers */}
                  {productModifiers.length > 0 && (
                    <div className="mb-3">
                      <p className="text-sm font-medium text-gray-700 mb-2">Modifiers:</p>
                      <div className="flex flex-wrap gap-1">
                        {productModifiers.map((modName, idx) => (
                          <span key={idx} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                            {modName}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Action Buttons */}
                  <div className="flex space-x-2">
                    <button
                      onClick={() => openModifiersModal(product)}
                      className="flex-1 px-3 py-2 text-sm bg-blue-50 text-blue-600 rounded-md border border-blue-200 hover:bg-blue-100 transition-colors flex items-center justify-center"
                    >
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                      Addons
                    </button>
                    <button
                      onClick={() => handleEdit(product)}
                      className="flex-1 px-3 py-2 text-sm bg-primary-50 text-primary-600 rounded-md border border-primary-200 hover:bg-primary-100 transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => openDeleteDialog(product)}
                      className="flex-1 px-3 py-2 text-sm bg-red-50 text-red-600 rounded-md border border-red-200 hover:bg-red-100 transition-colors"
                    >
                      Hapus
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
          
          {getSortedProducts().length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4-8-4m16 0v10l-8 4-8-4V7" />
              </svg>
              <p className="text-sm">Belum ada produk</p>
            </div>
          )}
        </div>
      </div>

      {/* Product Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-xl max-w-2xl w-full mx-4 p-4 sm:p-6 my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg sm:text-xl font-bold text-gray-900">
                {editingProduct ? 'Edit Produk' : 'Tambah Produk'}
              </h2>
              <button
                onClick={handleCloseModal}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nama Produk *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="input-field"
                    placeholder="Masukkan nama produk"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Harga *
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="0.01"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    className="input-field"
                    placeholder="0"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Kategori
                  </label>
                  <select
                    value={formData.category_id}
                    onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                    className="input-field"
                  >
                    <option value="">Pilih kategori</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    SKU
                  </label>
                  <input
                    type="text"
                    value={formData.sku}
                    onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                    className="input-field"
                    placeholder="SKU produk (opsional)"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Deskripsi
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="input-field"
                    placeholder="Deskripsi produk (opsional)"
                    rows="3"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    URL Gambar
                  </label>
                  <input
                    type="url"
                    value={formData.image_url}
                    onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                    className="input-field"
                    placeholder="https://example.com/image.jpg"
                  />
                  {formData.image_url && (
                    <div className="mt-2">
                      <img
                        src={formData.image_url}
                        alt="Preview"
                        className="h-32 w-32 object-cover rounded-lg"
                        onError={(e) => {
                          e.target.style.display = 'none';
                        }}
                      />
                    </div>
                  )}
                </div>

                <div className="md:col-span-2">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="is_active"
                      checked={formData.is_active}
                      onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                      className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                    />
                    <label htmlFor="is_active" className="ml-2 block text-sm text-gray-900">
                      Produk Aktif
                    </label>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:justify-end space-y-3 sm:space-y-0 sm:space-x-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="btn-secondary w-full sm:w-auto order-2 sm:order-1"
                >
                  Batal
                </button>
                <button type="submit" className="btn-primary w-full sm:w-auto order-1 sm:order-2">
                  {editingProduct ? 'Update' : 'Simpan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modifiers Management Modal */}
      {showModifiersModal && managingProductModifiers && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-2xl w-full mx-4 p-4 sm:p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-gray-900">
                  Kelola Addons / Level Kepedasan
                </h2>
                <p className="text-sm text-gray-600 mt-1 truncate">
                  {managingProductModifiers.name}
                </p>
              </div>
              <button
                onClick={handleCloseModifiersModal}
                className="text-gray-400 hover:text-gray-600 p-1 ml-2"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-3 max-h-96 overflow-y-auto mb-4">
              {modifierGroups.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p>Belum ada modifier groups.</p>
                  <p className="text-sm mt-2">Buat modifier group terlebih dahulu di menu Modifier Groups.</p>
                </div>
              ) : (
                modifierGroups.map((group) => (
                  <div
                    key={group.id}
                    className={`border rounded-lg p-3 sm:p-4 cursor-pointer transition-colors ${
                      selectedModifierGroups.includes(group.id)
                        ? 'border-primary-500 bg-primary-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => toggleModifierGroup(group.id)}
                  >
                    <div className="flex items-start">
                      <div className="flex items-center h-5">
                        <input
                          type="checkbox"
                          checked={selectedModifierGroups.includes(group.id)}
                          onChange={() => {}}
                          className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                        />
                      </div>
                      <div className="ml-3 flex-1 min-w-0">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                          <label className="font-medium text-gray-900 cursor-pointer truncate">
                            {group.name}
                          </label>
                          <div className="flex items-center gap-2 mt-2 sm:mt-0">
                            <span className={`text-xs px-2 py-0.5 rounded whitespace-nowrap ${
                              group.selection_type === 'single' 
                                ? 'bg-blue-100 text-blue-800' 
                                : 'bg-purple-100 text-purple-800'
                            }`}>
                              {group.selection_type === 'single' ? 'Pilih 1' : 'Pilih Banyak'}
                            </span>
                            {group.is_required && (
                              <span className="text-xs px-2 py-0.5 rounded bg-red-100 text-red-800 whitespace-nowrap">
                                Wajib
                              </span>
                            )}
                          </div>
                        </div>
                        <p className="text-sm text-gray-500 mt-1">
                          Min: {group.min_select} | Max: {group.max_select}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-3 sm:space-y-0 pt-4 border-t">
              <div className="text-sm text-gray-600 text-center sm:text-left">
                {selectedModifierGroups.length} modifier group dipilih
              </div>
              <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-3">
                <button
                  onClick={handleCloseModifiersModal}
                  className="btn-secondary w-full sm:w-auto order-2 sm:order-1"
                >
                  Batal
                </button>
                <button
                  onClick={handleSaveModifiers}
                  className="btn-primary w-full sm:w-auto order-1 sm:order-2"
                >
                  Simpan
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={deleteDialog.isOpen}
        onClose={closeDeleteDialog}
        onConfirm={handleDelete}
        title="Hapus Produk?"
        message={`Apakah Anda yakin ingin menghapus produk "${deleteDialog.productName}"? Tindakan ini tidak dapat dibatalkan.`}
        confirmText="Ya, Hapus"
        cancelText="Batal"
        type="danger"
      />
    </AdminLayout>
  );
};

export default Products;