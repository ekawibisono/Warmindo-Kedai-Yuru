import React, { useState, useEffect } from 'react';
import AdminLayout from '../components/admin/AdminLayout';
import { staffAPI } from '../services/api';
import ConfirmDialog from '../components/common/ConfirmDialog';
import { notify } from '../components/common/Toast';

const Discounts = () => {
    const [discounts, setDiscounts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingDiscount, setEditingDiscount] = useState(null);
    const [deleteDialog, setDeleteDialog] = useState({ isOpen: false, id: null, name: '' });

    // ✨ NEW: Load products and categories for selection
    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [loadingProducts, setLoadingProducts] = useState(false);
    const [productSearch, setProductSearch] = useState('');
    const [categorySearch, setCategorySearch] = useState('');

    const [formData, setFormData] = useState({
        code: '',
        name: '',
        description: '',
        discount_type: 'percentage',
        discount_scope: 'order', 
        value: '',
        min_order_amount: '',
        max_discount_amount: '',
        usage_limit: '',
        max_items: '',
        max_quantity_per_item: '',
        start_date: '',
        end_date: '',
        is_active: true,
        applies_to_product_ids: [], 
        applies_to_category_ids: []  
    });

    // ✨ Filter products based on search
    const filteredProducts = products.filter(product =>
        product.name.toLowerCase().includes(productSearch.toLowerCase())
    );

    // ✨ Filter categories based on search
    const filteredCategories = categories.filter(category =>
        category.name.toLowerCase().includes(categorySearch.toLowerCase())
    );

    useEffect(() => {
        fetchDiscounts();
        fetchProductsAndCategories();
    }, []);

    const fetchDiscounts = async () => {
        setLoading(true);
        try {
            const response = await staffAPI.getDiscounts();
            setDiscounts(response.data.discounts || []);
        } catch (error) {
            notify.error('Gagal memuat data diskon');
        } finally {
            setLoading(false);
        }
    };

    // ✨ NEW: Fetch products and categories
    const fetchProductsAndCategories = async () => {
        setLoadingProducts(true);
        try {
            const [productsRes, categoriesRes] = await Promise.all([
                staffAPI.getProducts(),
                staffAPI.getCategories()
            ]);
            
            // Handle different response formats
            let loadedProducts = [];
            let loadedCategories = [];
            
            // ✅ FIX: Check if response.data is directly an array
            if (Array.isArray(productsRes.data)) {
                loadedProducts = productsRes.data;
            } else if (productsRes.data?.products && Array.isArray(productsRes.data.products)) {
                loadedProducts = productsRes.data.products;
            } else if (Array.isArray(productsRes)) {
                loadedProducts = productsRes;
            }
            
            if (Array.isArray(categoriesRes.data)) {
                loadedCategories = categoriesRes.data;
            } else if (categoriesRes.data?.categories && Array.isArray(categoriesRes.data.categories)) {
                loadedCategories = categoriesRes.data.categories;
            } else if (Array.isArray(categoriesRes)) {
                loadedCategories = categoriesRes;
            }
            
            setProducts(loadedProducts);
            setCategories(loadedCategories);
            
        } catch (error) {
            notify.error('Gagal memuat data produk/kategori');
        } finally {
            setLoadingProducts(false);
        }
    };

    const resetForm = () => {
        setFormData({
            code: '', name: '', description: '', discount_type: 'percentage',
            discount_scope: 'order',
            value: '', min_order_amount: '', max_discount_amount: '',
            usage_limit: '', max_items: '', max_quantity_per_item: '', start_date: '', end_date: '', is_active: true,
            applies_to_product_ids: [],
            applies_to_category_ids: []
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
            discount_scope: discount.discount_scope || 'order',
            value: discount.value,
            min_order_amount: discount.min_order_amount || '',
            max_discount_amount: discount.max_discount_amount || '',
            usage_limit: discount.usage_limit || '',
            max_items: discount.max_items || '',
            max_quantity_per_item: discount.max_quantity_per_item || '',
            start_date: discount.start_date ? discount.start_date.slice(0, 16) : '',
            end_date: discount.end_date ? discount.end_date.slice(0, 16) : '',
            is_active: discount.is_active,
            applies_to_product_ids: discount.applies_to_product_ids || [],
            applies_to_category_ids: discount.applies_to_category_ids || []
        });
        setShowModal(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.name || !formData.value) {
            notify.error('Nama dan nilai diskon wajib diisi');
            return;
        }

        // ✨ NEW: Validate scope selection
        if (formData.discount_scope === 'product' && formData.applies_to_product_ids.length === 0) {
            notify.error('Pilih minimal 1 produk untuk scope "Produk Tertentu"');
            return;
        }

        if (formData.discount_scope === 'category' && formData.applies_to_category_ids.length === 0) {
            notify.error('Pilih minimal 1 kategori untuk scope "Kategori Tertentu"');
            return;
        }

        const formatDatetimeForBackend = (dateString) => {
            if (!dateString) return null;
            try {
                const date = new Date(dateString);
                return date.toISOString();
            } catch (error) {
                return null;
            }
        };

        const parseUsageLimit = (value) => {
            if (!value || value === '' || value === '0') {
                return null;
            }
            const parsed = parseInt(value);
            return parsed > 0 ? parsed : null;
        };

        const payload = {
            ...formData,
            value: parseFloat(formData.value),
            min_order_amount: formData.min_order_amount ? parseFloat(formData.min_order_amount) : 0,
            max_discount_amount: formData.max_discount_amount ? parseFloat(formData.max_discount_amount) : null,
            usage_limit: parseUsageLimit(formData.usage_limit),
            max_items: formData.max_items ? parseInt(formData.max_items) : null,
            max_quantity_per_item: formData.max_quantity_per_item ? parseInt(formData.max_quantity_per_item) : null,
            start_date: formatDatetimeForBackend(formData.start_date),
            end_date: formatDatetimeForBackend(formData.end_date),
            code: formData.code || null,
            // ✨ Clean up based on scope
            applies_to_product_ids: formData.discount_scope === 'product' ? formData.applies_to_product_ids : null,
            applies_to_category_ids: formData.discount_scope === 'category' ? formData.applies_to_category_ids : null
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
            resetForm();
            fetchDiscounts();
        } catch (error) {
            notify.error(error.response?.data?.error || error.response?.data?.message || 'Gagal menyimpan diskon');
        }
    };

    const handleDelete = async () => {
        try {
            await staffAPI.deleteDiscount(deleteDialog.id);
            notify.success('Diskon berhasil dihapus');
            closeDeleteDialog();
            fetchDiscounts();
        } catch (error) {
            notify.error('Gagal menghapus diskon');
        }
    };

    const closeDeleteDialog = () => {
        setDeleteDialog({ isOpen: false, id: null, name: '' });
    };

    const handleToggleActive = async (discount) => {
        try {
            await staffAPI.updateDiscount(discount.id, { is_active: !discount.is_active });
            notify.success(`Diskon ${!discount.is_active ? 'diaktifkan' : 'dinonaktifkan'}`);
            fetchDiscounts();
        } catch (error) {
            notify.error('Gagal mengubah status');
        }
    };

    // ✨ NEW: Handle multi-select for products
    const handleProductSelect = (productId) => {
        setFormData(prev => ({
            ...prev,
            applies_to_product_ids: prev.applies_to_product_ids.includes(productId)
                ? prev.applies_to_product_ids.filter(id => id !== productId)
                : [...prev.applies_to_product_ids, productId]
        }));
    };

    // ✨ NEW: Handle multi-select for categories
    const handleCategorySelect = (categoryId) => {
        setFormData(prev => ({
            ...prev,
            applies_to_category_ids: prev.applies_to_category_ids.includes(categoryId)
                ? prev.applies_to_category_ids.filter(id => id !== categoryId)
                : [...prev.applies_to_category_ids, categoryId]
        }));
    };

    // ✨ NEW: Get scope label
    const getScopeLabel = (discount) => {
        if (discount.discount_scope === 'product') {
            const count = discount.applies_to_product_ids?.length || 0;
            return `${count} Produk`;
        } else if (discount.discount_scope === 'category') {
            const count = discount.applies_to_category_ids?.length || 0;
            return `${count} Kategori`;
        }
        return 'Semua Produk';
    };

    return (
        <AdminLayout>
            <div className="p-3 sm:p-4 lg:p-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 sm:mb-6 space-y-3 sm:space-y-0">
                    <div>
                        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Kelola Diskon & Promo</h1>
                        <p className="text-xs sm:text-sm text-gray-600 mt-1">Buat dan kelola kode promo untuk pelanggan</p>
                    </div>
                    <button
                        onClick={handleOpenCreate}
                        className="w-full sm:w-auto px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors flex items-center justify-center gap-2 text-sm sm:text-base"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Buat Diskon Baru
                    </button>
                </div>

                {loading ? (
                    <div className="flex justify-center items-center h-48 sm:h-64">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                    </div>
                ) : discounts.length === 0 ? (
                    <div className="text-center py-12 sm:py-16 bg-white rounded-lg border-2 border-dashed border-gray-300">
                        <svg className="mx-auto h-10 w-10 sm:h-12 sm:w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <h3 className="mt-4 text-base sm:text-lg font-medium text-gray-900">Belum ada diskon</h3>
                        <p className="mt-2 text-sm text-gray-500">Mulai dengan membuat diskon pertama Anda</p>
                        <button
                            onClick={handleOpenCreate}
                            className="mt-6 px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors text-sm sm:text-base"
                        >
                            Buat Diskon Baru
                        </button>
                    </div>
                ) : (
                    <>
                        {/* Desktop Table View */}
                        <div className="hidden lg:block bg-white rounded-lg shadow-sm overflow-hidden">
                            <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kode & Nama</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tipe & Nilai</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Scope</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Periode</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Penggunaan</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {discounts.map((discount) => (
                                    <tr key={discount.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4">
                                            <div>
                                                {discount.code && (
                                                    <div className="text-xs font-mono font-bold text-blue-600 mb-1">
                                                        {discount.code}
                                                    </div>
                                                )}
                                                <div className="text-sm font-medium text-gray-900">{discount.name}</div>
                                                {discount.description && (
                                                    <div className="text-xs text-gray-500 mt-1">{discount.description}</div>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm">
                                                <span className="font-semibold text-gray-900">
                                                    {discount.discount_type === 'percentage' 
                                                        ? `${discount.value}%`
                                                        : `Rp ${discount.value.toLocaleString('id-ID')}`
                                                    }
                                                </span>
                                                {discount.max_discount_amount && (
                                                    <div className="text-xs text-gray-500 mt-1">
                                                        Maks. Rp {discount.max_discount_amount.toLocaleString('id-ID')}
                                                    </div>
                                                )}
                                                {discount.min_order_amount > 0 && (
                                                    <div className="text-xs text-gray-500">
                                                        Min. Rp {discount.min_order_amount.toLocaleString('id-ID')}
                                                    </div>
                                                )}
                                                {discount.max_items && (
                                                    <div className="text-xs text-amber-600 font-medium">
                                                        Maks. {discount.max_items} item
                                                    </div>
                                                )}
                                                {discount.max_quantity_per_item && (
                                                    <div className="text-xs text-red-600 font-medium">
                                                        Maks. {discount.max_quantity_per_item} qty/item
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                                                {getScopeLabel(discount)}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-500">
                                            {discount.start_date ? new Date(discount.start_date).toLocaleDateString('id-ID') : '-'}
                                            {' s/d '}
                                            {discount.end_date ? new Date(discount.end_date).toLocaleDateString('id-ID') : '-'}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm">
                                                <span className="font-medium text-gray-900">{discount.used_count || 0}</span>
                                                {discount.usage_limit && (
                                                    <span className="text-gray-500"> / {discount.usage_limit}</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <button
                                                onClick={() => handleToggleActive(discount)}
                                                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                                    discount.is_active
                                                        ? 'bg-green-100 text-green-800'
                                                        : 'bg-gray-100 text-gray-800'
                                                }`}
                                            >
                                                {discount.is_active ? 'Aktif' : 'Nonaktif'}
                                            </button>
                                        </td>
                                        <td className="px-6 py-4 text-right text-sm font-medium">
                                            <button
                                                onClick={() => handleOpenEdit(discount)}
                                                className="text-blue-600 hover:text-blue-900 mr-3"
                                            >
                                                Edit
                                            </button>
                                            <button
                                                onClick={() => setDeleteDialog({ isOpen: true, id: discount.id, name: discount.name })}
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

                    {/* Mobile/Tablet Card View */}
                    <div className="lg:hidden space-y-4">
                        {discounts.map((discount) => (
                            <div key={discount.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                                {/* Header: Name and Status */}
                                <div className="flex items-start justify-between mb-3">
                                    <div className="flex-1">
                                        {discount.code && (
                                            <div className="text-xs font-mono font-bold text-blue-600 mb-1">
                                                {discount.code}
                                            </div>
                                        )}
                                        <h3 className="text-sm font-semibold text-gray-900 leading-tight">{discount.name}</h3>
                                        {discount.description && (
                                            <p className="text-xs text-gray-500 mt-1">{discount.description}</p>
                                        )}
                                    </div>
                                    <button
                                        onClick={() => handleToggleActive(discount)}
                                        className={`ml-3 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                            discount.is_active
                                                ? 'bg-green-100 text-green-800'
                                                : 'bg-gray-100 text-gray-800'
                                        }`}
                                    >
                                        {discount.is_active ? 'Aktif' : 'Nonaktif'}
                                    </button>
                                </div>

                                {/* Value and Scope */}
                                <div className="grid grid-cols-2 gap-3 mb-3">
                                    <div>
                                        <p className="text-xs text-gray-500 mb-1">Nilai Diskon</p>
                                        <p className="text-sm font-bold text-gray-900">
                                            {discount.discount_type === 'percentage' 
                                                ? `${discount.value}%`
                                                : `Rp ${discount.value.toLocaleString('id-ID')}`
                                            }
                                        </p>
                                        {discount.max_discount_amount && (
                                            <p className="text-xs text-gray-500">Maks. Rp {discount.max_discount_amount.toLocaleString('id-ID')}</p>
                                        )}
                                        {discount.min_order_amount > 0 && (
                                            <p className="text-xs text-gray-500">Min. Rp {discount.min_order_amount.toLocaleString('id-ID')}</p>
                                        )}
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500 mb-1">Berlaku Untuk</p>
                                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                                            {getScopeLabel(discount)}
                                        </span>
                                    </div>
                                </div>

                                {/* Limits */}
                                {(discount.max_items || discount.max_quantity_per_item) && (
                                    <div className="mb-3">
                                        <p className="text-xs text-gray-500 mb-1">Batasan</p>
                                        <div className="flex flex-wrap gap-1">
                                            {discount.max_items && (
                                                <span className="text-xs bg-amber-100 text-amber-800 px-2 py-1 rounded-full font-medium">
                                                    Maks. {discount.max_items} item
                                                </span>
                                            )}
                                            {discount.max_quantity_per_item && (
                                                <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded-full font-medium">
                                                    Maks. {discount.max_quantity_per_item} qty/item
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Period and Usage */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4 text-xs">
                                    <div>
                                        <p className="text-gray-500 mb-1">Periode</p>
                                        <p className="text-gray-900">
                                            {discount.start_date ? new Date(discount.start_date).toLocaleDateString('id-ID') : '-'}
                                            {' s/d '}
                                            {discount.end_date ? new Date(discount.end_date).toLocaleDateString('id-ID') : '-'}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-gray-500 mb-1">Penggunaan</p>
                                        <p className="text-gray-900">
                                            <span className="font-medium">{discount.used_count || 0}</span>
                                            {discount.usage_limit && (
                                                <span className="text-gray-500"> / {discount.usage_limit}</span>
                                            )}
                                        </p>
                                    </div>
                                </div>

                                {/* Action Buttons */}
                                <div className="flex flex-col sm:flex-row gap-2">
                                    <button
                                        onClick={() => handleOpenEdit(discount)}
                                        className="flex-1 px-3 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 font-medium transition-colors text-sm flex items-center justify-center gap-2"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                        </svg>
                                        Edit
                                    </button>
                                    <button
                                        onClick={() => setDeleteDialog({ isOpen: true, id: discount.id, name: discount.name })}
                                        className="flex-1 px-3 py-2 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 font-medium transition-colors text-sm flex items-center justify-center gap-2"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                        Hapus
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                    </>
                )}

                {/* Modal Form */}
                {showModal && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end sm:items-center justify-center p-0 sm:p-4 z-50">
                        <div className="bg-white rounded-t-xl sm:rounded-xl shadow-2xl w-full max-w-2xl max-h-[95vh] sm:max-h-[90vh] overflow-y-auto">
                            <div className="sticky top-0 bg-white border-b px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between z-10">
                                <h2 className="text-lg sm:text-xl font-bold text-gray-900">
                                    {editingDiscount ? 'Edit Diskon' : 'Buat Diskon Baru'}
                                </h2>
                                <button
                                    onClick={() => setShowModal(false)}
                                    className="text-gray-400 hover:text-gray-600 transition-colors p-1"
                                >
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>

                            <form onSubmit={handleSubmit} className="p-4 sm:p-6">
                                <div className="space-y-4 sm:space-y-5">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Nama Diskon <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.name}
                                            onChange={(e) => setFormData({...formData, name: e.target.value})}
                                            className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                                            placeholder="Diskon Hari Kemerdekaan"
                                            required
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Deskripsi</label>
                                        <textarea
                                            value={formData.description}
                                            onChange={(e) => setFormData({...formData, description: e.target.value})}
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                            rows="2"
                                            placeholder="Deskripsi singkat tentang promo ini..."
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Kode Promo</label>
                                        <input
                                            type="text"
                                            value={formData.code}
                                            onChange={(e) => setFormData({...formData, code: e.target.value.toUpperCase()})}
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg font-mono focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                            placeholder="DISKON100"
                                        />
                                        <p className="text-xs text-gray-500 mt-1.5">Kosongkan jika tidak memerlukan kode</p>
                                    </div>

                                    {/* ✨ NEW: Discount Scope Selector */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Berlaku Untuk <span className="text-red-500">*</span>
                                        </label>
                                        <select
                                            value={formData.discount_scope}
                                            onChange={(e) => setFormData({
                                                ...formData,
                                                discount_scope: e.target.value,
                                                applies_to_product_ids: [],
                                                applies_to_category_ids: []
                                            })}
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        >
                                            <option value="order">Semua Produk</option>
                                            <option value="product">Produk Tertentu</option>
                                            <option value="category">Kategori Tertentu</option>
                                        </select>
                                    </div>

                                    {/* ✨ NEW: Product Selector */}
                                    {formData.discount_scope === 'product' && (
                                        <div>
                                            <div className="flex items-center justify-between mb-2">
                                                <label className="block text-sm font-medium text-gray-700">
                                                    Pilih Produk <span className="text-red-500">*</span>
                                                </label>
                                                {products.length > 0 && (
                                                    <div className="flex gap-2">
                                                        <button
                                                            type="button"
                                                            onClick={() => setFormData({
                                                                ...formData,
                                                                applies_to_product_ids: products.map(p => p.id)
                                                            })}
                                                            className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                                                        >
                                                            Pilih Semua
                                                        </button>
                                                        <span className="text-gray-300">|</span>
                                                        <button
                                                            type="button"
                                                            onClick={() => setFormData({
                                                                ...formData,
                                                                applies_to_product_ids: []
                                                            })}
                                                            className="text-xs text-gray-600 hover:text-gray-700 font-medium"
                                                        >
                                                            Hapus Semua
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                            
                                            
                                            {/* Search Box */}
                                            {products.length > 5 && (
                                                <div className="mb-2">
                                                    <input
                                                        type="text"
                                                        placeholder="🔍 Cari produk..."
                                                        value={productSearch}
                                                        onChange={(e) => setProductSearch(e.target.value)}
                                                        className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                    />
                                                </div>
                                            )}
                                            
                                            <div className="border border-gray-300 rounded-lg p-3 max-h-48 overflow-y-auto bg-gray-50">
                                                {loadingProducts ? (
                                                    <div className="text-center py-4">
                                                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
                                                        <p className="text-xs text-gray-500 mt-2">Memuat produk...</p>
                                                    </div>
                                                ) : products.length === 0 ? (
                                                    <div className="text-center py-4">
                                                        <p className="text-sm text-gray-500">Tidak ada produk tersedia</p>
                                                        <button
                                                            type="button"
                                                            onClick={fetchProductsAndCategories}
                                                            className="text-xs text-blue-600 hover:text-blue-700 mt-2 underline"
                                                        >
                                                            🔄 Muat ulang
                                                        </button>
                                                    </div>
                                                ) : filteredProducts.length === 0 ? (
                                                    <div className="text-center py-4">
                                                        <p className="text-sm text-gray-500">Tidak ada produk yang cocok dengan "{productSearch}"</p>
                                                    </div>
                                                ) : (
                                                    <div className="space-y-2">
                                                        {filteredProducts.map(product => (
                                                            <label key={product.id} className="flex items-center cursor-pointer hover:bg-white p-2 rounded transition-colors">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={formData.applies_to_product_ids.includes(product.id)}
                                                                    onChange={() => handleProductSelect(product.id)}
                                                                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                                                />
                                                                <div className="ml-3 flex-1">
                                                                    <span className="text-sm font-medium text-gray-900">{product.name}</span>
                                                                    {product.price && (
                                                                        <span className="ml-2 text-xs text-gray-500">
                                                                            Rp {parseFloat(product.price).toLocaleString('id-ID')}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </label>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                            <p className="text-xs text-gray-500 mt-1.5">
                                                {formData.applies_to_product_ids.length > 0 ? (
                                                    <span className="text-blue-600 font-medium">
                                                        ✓ Dipilih: {formData.applies_to_product_ids.length} produk
                                                    </span>
                                                ) : (
                                                    <span className="text-amber-600">
                                                        ⚠ Belum ada produk yang dipilih
                                                    </span>
                                                )}
                                            </p>
                                        </div>
                                    )}

                                    {/* ✨ NEW: Category Selector */}
                                    {formData.discount_scope === 'category' && (
                                        <div>
                                            <div className="flex items-center justify-between mb-2">
                                                <label className="block text-sm font-medium text-gray-700">
                                                    Pilih Kategori <span className="text-red-500">*</span>
                                                </label>
                                                {categories.length > 0 && (
                                                    <div className="flex gap-2">
                                                        <button
                                                            type="button"
                                                            onClick={() => setFormData({
                                                                ...formData,
                                                                applies_to_category_ids: categories.map(c => c.id)
                                                            })}
                                                            className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                                                        >
                                                            Pilih Semua
                                                        </button>
                                                        <span className="text-gray-300">|</span>
                                                        <button
                                                            type="button"
                                                            onClick={() => setFormData({
                                                                ...formData,
                                                                applies_to_category_ids: []
                                                            })}
                                                            className="text-xs text-gray-600 hover:text-gray-700 font-medium"
                                                        >
                                                            Hapus Semua
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                            
                                            
                                            {/* Search Box */}
                                            {categories.length > 5 && (
                                                <div className="mb-2">
                                                    <input
                                                        type="text"
                                                        placeholder="🔍 Cari kategori..."
                                                        value={categorySearch}
                                                        onChange={(e) => setCategorySearch(e.target.value)}
                                                        className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                    />
                                                </div>
                                            )}
                                            
                                            <div className="border border-gray-300 rounded-lg p-3 max-h-48 overflow-y-auto bg-gray-50">
                                                {loadingProducts ? (
                                                    <div className="text-center py-4">
                                                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
                                                        <p className="text-xs text-gray-500 mt-2">Memuat kategori...</p>
                                                    </div>
                                                ) : categories.length === 0 ? (
                                                    <div className="text-center py-4">
                                                        <p className="text-sm text-gray-500">Tidak ada kategori tersedia</p>
                                                        <button
                                                            type="button"
                                                            onClick={fetchProductsAndCategories}
                                                            className="text-xs text-blue-600 hover:text-blue-700 mt-2 underline"
                                                        >
                                                            🔄 Muat ulang
                                                        </button>
                                                    </div>
                                                ) : filteredCategories.length === 0 ? (
                                                    <div className="text-center py-4">
                                                        <p className="text-sm text-gray-500">Tidak ada kategori yang cocok dengan "{categorySearch}"</p>
                                                    </div>
                                                ) : (
                                                    <div className="space-y-2">
                                                        {filteredCategories.map(category => (
                                                            <label key={category.id} className="flex items-center cursor-pointer hover:bg-white p-2 rounded transition-colors">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={formData.applies_to_category_ids.includes(category.id)}
                                                                    onChange={() => handleCategorySelect(category.id)}
                                                                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                                                />
                                                                <div className="ml-3 flex-1">
                                                                    <span className="text-sm font-medium text-gray-900">{category.name}</span>
                                                                    {category.description && (
                                                                        <span className="ml-2 text-xs text-gray-500">
                                                                            {category.description}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </label>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                            <p className="text-xs text-gray-500 mt-1.5">
                                                {formData.applies_to_category_ids.length > 0 ? (
                                                    <span className="text-blue-600 font-medium">
                                                        ✓ Dipilih: {formData.applies_to_category_ids.length} kategori
                                                    </span>
                                                ) : (
                                                    <span className="text-amber-600">
                                                        ⚠ Belum ada kategori yang dipilih
                                                    </span>
                                                )}
                                            </p>
                                        </div>
                                    )}

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">Tipe</label>
                                            <select
                                                value={formData.discount_type}
                                                onChange={(e) => setFormData({...formData, discount_type: e.target.value})}
                                                className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                                            >
                                                <option value="percentage">Persentase (%)</option>
                                                <option value="fixed">Nominal (Rp)</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Nilai <span className="text-red-500">*</span>
                                            </label>
                                            <input
                                                type="number"
                                                min="0"
                                                step="any"
                                                value={formData.value}
                                                onChange={(e) => setFormData({...formData, value: e.target.value})}
                                                className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                                                required
                                                placeholder={formData.discount_type === 'percentage' ? '100' : '50000'}
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">Min. Order (Rp)</label>
                                            <input
                                                type="number"
                                                min="0"
                                                step="any"
                                                value={formData.min_order_amount}
                                                onChange={(e) => setFormData({...formData, min_order_amount: e.target.value})}
                                                className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                                                placeholder="0"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">Maks. Diskon (Rp)</label>
                                            <input
                                                type="number"
                                                min="0"
                                                step="any"
                                                value={formData.max_discount_amount}
                                                onChange={(e) => setFormData({...formData, max_discount_amount: e.target.value})}
                                                className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                                                placeholder="Unlimited"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Batas Penggunaan</label>
                                        <input
                                            type="number"
                                            min="1"
                                            value={formData.usage_limit}
                                            onChange={(e) => setFormData({...formData, usage_limit: e.target.value})}
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                            placeholder="Kosongkan untuk unlimited"
                                        />
                                        <p className="text-xs text-gray-500 mt-1.5">
                                            Kosongkan atau isi 0 untuk unlimited. Minimal 1 jika diisi.
                                        </p>
                                    </div>

                                    {/* ✨ NEW: Max Items Field */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Maks. Jumlah Item dalam Cart
                                        </label>
                                        <input
                                            type="number"
                                            min="1"
                                            value={formData.max_items}
                                            onChange={(e) => setFormData({...formData, max_items: e.target.value})}
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                            placeholder="Kosongkan untuk unlimited"
                                        />
                                        <p className="text-xs text-gray-500 mt-1.5">
                                            Promo hanya berlaku jika jumlah <strong>jenis item</strong> di cart tidak melebihi nilai ini. 
                                            Contoh: isi <strong>1</strong> jika promo hanya untuk pembelian 1 item saja. Kosongkan untuk unlimited.
                                        </p>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Maks. Quantity Per Item
                                        </label>
                                        <input
                                            type="number"
                                            min="1"
                                            value={formData.max_quantity_per_item}
                                            onChange={(e) => setFormData({...formData, max_quantity_per_item: e.target.value})}
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                            placeholder="Kosongkan untuk unlimited"
                                        />
                                        <p className="text-xs text-gray-500 mt-1.5">
                                            Promo hanya berlaku jika quantity setiap item tidak melebihi nilai ini. 
                                            Contoh: isi <strong>1</strong> jika promo hanya untuk 1 qty (tidak boleh 2x Nasi Goreng).
                                        </p>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">Tanggal Mulai</label>
                                            <input
                                                type="datetime-local"
                                                value={formData.start_date}
                                                onChange={(e) => setFormData({...formData, start_date: e.target.value})}
                                                className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">Tanggal Berakhir</label>
                                            <input
                                                type="datetime-local"
                                                value={formData.end_date}
                                                onChange={(e) => setFormData({...formData, end_date: e.target.value})}
                                                className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                                            />
                                        </div>
                                    </div>

                                    <div className="pt-2">
                                        <label className="flex items-center cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={formData.is_active}
                                                onChange={(e) => setFormData({...formData, is_active: e.target.checked})}
                                                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                            />
                                            <span className="ml-2 text-sm font-medium text-gray-700">Aktifkan diskon</span>
                                        </label>
                                    </div>
                                </div>

                                <div className="flex flex-col sm:flex-row justify-end gap-3 mt-6 pt-6 border-t">
                                    <button
                                        type="button"
                                        onClick={() => setShowModal(false)}
                                        className="w-full sm:w-auto px-5 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium transition-colors text-sm sm:text-base order-2 sm:order-1"
                                    >
                                        Batal
                                    </button>
                                    <button
                                        type="submit"
                                        className="w-full sm:w-auto px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors text-sm sm:text-base order-1 sm:order-2"
                                    >
                                        {editingDiscount ? 'Simpan Perubahan' : 'Buat Diskon'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                <ConfirmDialog
                    isOpen={deleteDialog.isOpen}
                    title="Hapus Diskon?"
                    message={`Yakin ingin menghapus diskon "${deleteDialog.name}"? Tindakan ini tidak dapat dibatalkan.`}
                    confirmText="Hapus"
                    confirmStyle="danger"
                    onConfirm={handleDelete}
                    onCancel={closeDeleteDialog}
                    onClose={closeDeleteDialog}
                />
            </div>
        </AdminLayout>
    );
};

export default Discounts;