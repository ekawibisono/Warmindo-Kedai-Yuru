import React, { useState, useEffect } from 'react';
import AdminLayout from '../components/admin/AdminLayout';
import ConfirmDialog from '../components/common/ConfirmDialog';
import { staffAPI } from '../services/api';
import notify from '../components/common/Toast';

const HotDeals = () => {
    const [products, setProducts] = useState([]);
    const [tiers, setTiers] = useState([]);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('products'); // 'products' or 'tiers'

    // Product management states
    const [showApplyModal, setShowApplyModal] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [discountPercent, setDiscountPercent] = useState(10);

    // Tier management states
    const [showTierModal, setShowTierModal] = useState(false);
    const [editingTier, setEditingTier] = useState(null);
    const [tierForm, setTierForm] = useState({
        tier_name: '',
        min_sold: 0,
        max_sold: null,
        discount_percent: 0,
        is_active: true,
    });

    // Confirm dialogs
    const [removeDialog, setRemoveDialog] = useState({
        isOpen: false,
        productId: null,
        productName: '',
    });

    const [deleteTierDialog, setDeleteTierDialog] = useState({
        isOpen: false,
        tierId: null,
        tierName: '',
    });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [productsRes, tiersRes, statsRes] = await Promise.all([
                staffAPI.getProductsWithHotDealStatus(),
                staffAPI.getHotDealTiers(),
                staffAPI.getHotDealsStats(),
            ]);

            setProducts(productsRes.data || []);
            setTiers(tiersRes.data || []);
            setStats(statsRes.data || null);
        } catch (error) {
            console.error('Error fetching hot deals data:', error);
            notify.error('Gagal memuat data Hot Deals');
        } finally {
            setLoading(false);
        }
    };

    // ========== PRODUCT HOT DEAL MANAGEMENT ==========

    const handleApplyHotDeal = (product) => {
        setSelectedProduct(product);
        setDiscountPercent(product.discount_percent || 10);
        setShowApplyModal(true);
    };

    const handleApplySubmit = async () => {
        try {
            await staffAPI.applyHotDeal(selectedProduct.id, discountPercent);
            notify.success(`Hot Deal ${discountPercent}% berhasil diterapkan pada ${selectedProduct.name}`);
            fetchData();
            setShowApplyModal(false);
            setSelectedProduct(null);
        } catch (error) {
            console.error('Error applying hot deal:', error);
            notify.error('Gagal menerapkan Hot Deal');
        }
    };

    const handleRemoveHotDeal = (product) => {
        setRemoveDialog({
            isOpen: true,
            productId: product.id,
            productName: product.name,
        });
    };

    const confirmRemoveHotDeal = async () => {
        try {
            await staffAPI.removeHotDeal(removeDialog.productId);
            notify.success(`Hot Deal berhasil dihapus dari ${removeDialog.productName}`);
            fetchData();
            setRemoveDialog({ isOpen: false, productId: null, productName: '' });
        } catch (error) {
            console.error('Error removing hot deal:', error);
            notify.error('Gagal menghapus Hot Deal');
        }
    };

    const handleAutoUpdate = async () => {
        try {
            setLoading(true);
            const response = await staffAPI.updateHotDealsAuto();
            notify.success(response.data.message || 'Hot Deals berhasil diupdate otomatis');
            fetchData();
        } catch (error) {
            console.error('Error auto updating hot deals:', error);
            notify.error('Gagal update Hot Deals otomatis');
        } finally {
            setLoading(false);
        }
    };

    // ========== TIER MANAGEMENT ==========

    const handleEditTier = (tier) => {
        setEditingTier(tier);
        setTierForm({
            tier_name: tier.tier_name,
            min_sold: tier.min_sold,
            max_sold: tier.max_sold,
            discount_percent: tier.discount_percent,
            is_active: tier.is_active,
        });
        setShowTierModal(true);
    };

    const handleAddTier = () => {
        setEditingTier(null);
        setTierForm({
            tier_name: '',
            min_sold: 0,
            max_sold: null,
            discount_percent: 0,
            is_active: true,
        });
        setShowTierModal(true);
    };

    const handleTierSubmit = async (e) => {
        e.preventDefault();

        const payload = {
            ...tierForm,
            min_sold: parseInt(tierForm.min_sold),
            max_sold: tierForm.max_sold ? parseInt(tierForm.max_sold) : null,
            discount_percent: parseFloat(tierForm.discount_percent),
        };

        try {
            if (editingTier) {
                await staffAPI.updateHotDealTier(editingTier.id, payload);
                notify.success('Tier berhasil diupdate');
            } else {
                await staffAPI.createHotDealTier(payload);
                notify.success('Tier baru berhasil ditambahkan');
            }

            fetchData();
            setShowTierModal(false);
        } catch (error) {
            console.error('Error saving tier:', error);
            notify.error('Gagal menyimpan tier');
        }
    };

    const handleDeleteTier = (tier) => {
        setDeleteTierDialog({
            isOpen: true,
            tierId: tier.id,
            tierName: tier.tier_name,
        });
    };

    const confirmDeleteTier = async () => {
        try {
            await staffAPI.deleteHotDealTier(deleteTierDialog.tierId);
            notify.success(`Tier "${deleteTierDialog.tierName}" berhasil dihapus`);
            fetchData();
            setDeleteTierDialog({ isOpen: false, tierId: null, tierName: '' });
        } catch (error) {
            console.error('Error deleting tier:', error);
            notify.error('Gagal menghapus tier');
        }
    };

    // ========== UTILITIES ==========

    const formatRupiah = (number) => {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0,
        }).format(number);
    };

    const hotDealsProducts = products.filter(p => p.is_hot_deal);
    const nonHotDealsProducts = products.filter(p => !p.is_hot_deal);

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
                {/* Header */}
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                            🔥 Hot Deals Management
                        </h1>
                        <p className="text-gray-600 mt-2">
                            Kelola produk Hot Deals dan pengaturan tier diskon otomatis
                        </p>
                    </div>
                    <button
                        onClick={handleAutoUpdate}
                        className="btn-secondary flex items-center gap-2"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        Update Otomatis
                    </button>
                </div>

                {/* Statistics Cards */}
                {stats && (
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        <div className="card bg-gradient-to-br from-red-500 to-red-600 text-white">
                            <div className="flex items-start justify-between">
                                <div>
                                    <p className="text-red-100 text-sm">Total Hot Deals</p>
                                    <h3 className="text-3xl font-bold mt-2">{stats.total_hot_deals}</h3>
                                    <p className="text-red-100 text-xs mt-1">dari {stats.total_products} produk</p>
                                </div>
                                <div className="bg-white bg-opacity-20 p-3 rounded-lg">
                                    <span className="text-3xl">🔥</span>
                                </div>
                            </div>
                        </div>

                        <div className="card bg-gradient-to-br from-orange-500 to-orange-600 text-white">
                            <div className="flex items-start justify-between">
                                <div>
                                    <p className="text-orange-100 text-sm">Rata-rata Diskon</p>
                                    <h3 className="text-3xl font-bold mt-2">{stats.average_discount}%</h3>
                                    <p className="text-orange-100 text-xs mt-1">persentase diskon</p>
                                </div>
                                <div className="bg-white bg-opacity-20 p-3 rounded-lg">
                                    <span className="text-3xl">%</span>
                                </div>
                            </div>
                        </div>

                        <div className="card bg-gradient-to-br from-green-500 to-green-600 text-white">
                            <div className="flex items-start justify-between">
                                <div>
                                    <p className="text-green-100 text-sm">Total Terjual</p>
                                    <h3 className="text-3xl font-bold mt-2">{stats.total_sold_hot_deals}</h3>
                                    <p className="text-green-100 text-xs mt-1">produk hot deals</p>
                                </div>
                                <div className="bg-white bg-opacity-20 p-3 rounded-lg">
                                    <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                    </svg>
                                </div>
                            </div>
                        </div>

                        <div className="card bg-gradient-to-br from-blue-500 to-blue-600 text-white">
                            <div className="flex items-start justify-between">
                                <div>
                                    <p className="text-blue-100 text-sm">Total Hemat/Item</p>
                                    <h3 className="text-2xl font-bold mt-2">{formatRupiah(stats.total_savings_per_item)}</h3>
                                    <p className="text-blue-100 text-xs mt-1">per produk</p>
                                </div>
                                <div className="bg-white bg-opacity-20 p-3 rounded-lg">
                                    <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                                    </svg>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Tabs */}
                <div className="border-b border-gray-200">
                    <nav className="-mb-px flex space-x-8">
                        <button
                            onClick={() => setActiveTab('products')}
                            className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'products'
                                    ? 'border-primary-500 text-primary-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                }`}
                        >
                            📦 Produk Hot Deals
                        </button>
                        <button
                            onClick={() => setActiveTab('tiers')}
                            className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'tiers'
                                    ? 'border-primary-500 text-primary-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                }`}
                        >
                            ⚙️ Pengaturan Tier
                        </button>
                    </nav>
                </div>

                {/* Products Tab */}
                {activeTab === 'products' && (
                    <div className="space-y-6">
                        {/* Active Hot Deals */}
                        <div className="card">
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-xl font-bold text-gray-900">
                                    🔥 Produk Hot Deals Aktif ({hotDealsProducts.length})
                                </h2>
                            </div>

                            {hotDealsProducts.length > 0 ? (
                                <div className="overflow-x-auto">
                                    <table className="min-w-full divide-y divide-gray-200">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Produk</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Harga Asli</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Diskon</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Harga Diskon</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Hemat</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Terjual</th>
                                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Aksi</th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-200">
                                            {hotDealsProducts.map((product) => (
                                                <tr key={product.id} className="hover:bg-gray-50">
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center">
                                                            {product.image_url && (
                                                                <img src={product.image_url} alt={product.name} className="w-12 h-12 rounded-lg object-cover mr-3" />
                                                            )}
                                                            <div>
                                                                <div className="text-sm font-medium text-gray-900">{product.name}</div>
                                                                <div className="text-xs text-gray-500">{product.category_name}</div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 text-sm text-gray-500 line-through">
                                                        {formatRupiah(product.original_price || 0)}
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                                                            {product.discount_percent}% OFF
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-sm font-bold text-red-600">
                                                        {formatRupiah(product.price)}
                                                    </td>
                                                    <td className="px-6 py-4 text-sm font-semibold text-green-600">
                                                        {formatRupiah(product.savings)}
                                                    </td>
                                                    <td className="px-6 py-4 text-sm text-gray-900">
                                                        <span className="font-semibold">{product.total_sold || 0}</span>
                                                    </td>
                                                    <td className="px-6 py-4 text-right text-sm font-medium space-x-2">
                                                        <button
                                                            onClick={() => handleApplyHotDeal(product)}
                                                            className="text-blue-600 hover:text-blue-900"
                                                        >
                                                            Edit
                                                        </button>
                                                        <button
                                                            onClick={() => handleRemoveHotDeal(product)}
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
                            ) : (
                                <div className="text-center py-12 text-gray-500">
                                    <div className="text-6xl mb-4">🔍</div>
                                    <p>Belum ada produk Hot Deals aktif</p>
                                </div>
                            )}
                        </div>

                        {/* Available Products */}
                        <div className="card">
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-xl font-bold text-gray-900">
                                    📦 Produk Tersedia ({nonHotDealsProducts.length})
                                </h2>
                            </div>

                            {nonHotDealsProducts.length > 0 ? (
                                <div className="overflow-x-auto">
                                    <table className="min-w-full divide-y divide-gray-200">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Produk</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Harga</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Terjual</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Aksi</th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-200">
                                            {nonHotDealsProducts.map((product) => (
                                                <tr key={product.id} className="hover:bg-gray-50">
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center">
                                                            {product.image_url && (
                                                                <img src={product.image_url} alt={product.name} className="w-12 h-12 rounded-lg object-cover mr-3" />
                                                            )}
                                                            <div>
                                                                <div className="text-sm font-medium text-gray-900">{product.name}</div>
                                                                <div className="text-xs text-gray-500">{product.category_name}</div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                                                        {formatRupiah(product.price)}
                                                    </td>
                                                    <td className="px-6 py-4 text-sm text-gray-900">
                                                        {product.total_sold || 0}
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${product.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                                                            }`}>
                                                            {product.is_active ? 'Aktif' : 'Nonaktif'}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-right text-sm font-medium">
                                                        <button
                                                            onClick={() => handleApplyHotDeal(product)}
                                                            className="text-primary-600 hover:text-primary-900 font-medium"
                                                        >
                                                            + Tambah Hot Deal
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <div className="text-center py-12 text-gray-500">
                                    <p>Semua produk sudah menjadi Hot Deals!</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Tiers Tab */}
                {activeTab === 'tiers' && (
                    <div className="card">
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <h2 className="text-xl font-bold text-gray-900">Pengaturan Tier Diskon</h2>
                                <p className="text-sm text-gray-600 mt-1">
                                    Tier akan otomatis diterapkan berdasarkan jumlah produk terjual
                                </p>
                            </div>
                            <button onClick={handleAddTier} className="btn-primary">
                                + Tambah Tier
                            </button>
                        </div>

                        {tiers.length > 0 ? (
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tier</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Min Terjual</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Max Terjual</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Diskon</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Aksi</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {tiers.map((tier) => (
                                            <tr key={tier.id} className="hover:bg-gray-50">
                                                <td className="px-6 py-4">
                                                    <span className="text-sm font-bold text-gray-900">{tier.tier_name}</span>
                                                </td>
                                                <td className="px-6 py-4 text-sm text-gray-900">{tier.min_sold}</td>
                                                <td className="px-6 py-4 text-sm text-gray-900">{tier.max_sold || '∞'}</td>
                                                <td className="px-6 py-4">
                                                    <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-orange-100 text-orange-800">
                                                        {tier.discount_percent}%
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${tier.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                                                        }`}>
                                                        {tier.is_active ? 'Aktif' : 'Nonaktif'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-right text-sm font-medium space-x-2">
                                                    <button
                                                        onClick={() => handleEditTier(tier)}
                                                        className="text-blue-600 hover:text-blue-900"
                                                    >
                                                        Edit
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteTier(tier)}
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
                        ) : (
                            <div className="text-center py-12 text-gray-500">
                                <div className="text-6xl mb-4">⚙️</div>
                                <p>Belum ada tier yang dikonfigurasi</p>
                                <button onClick={handleAddTier} className="mt-4 btn-primary">
                                    Tambah Tier Pertama
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {/* Apply Hot Deal Modal */}
                {showApplyModal && selectedProduct && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                        <div className="bg-white rounded-2xl max-w-md w-full p-6">
                            <h3 className="text-2xl font-bold text-gray-900 mb-4">
                                {selectedProduct.is_hot_deal ? 'Edit' : 'Tambah'} Hot Deal
                            </h3>

                            <div className="mb-4">
                                <p className="text-sm text-gray-600 mb-2">Produk:</p>
                                <p className="text-lg font-semibold text-gray-900">{selectedProduct.name}</p>
                            </div>

                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Persentase Diskon (%)
                                </label>
                                <input
                                    type="number"
                                    min="0"
                                    max="100"
                                    value={discountPercent}
                                    onChange={(e) => setDiscountPercent(parseFloat(e.target.value))}
                                    className="input-field"
                                />
                            </div>

                            <div className="bg-gray-50 rounded-lg p-4 mb-6">
                                <div className="flex justify-between mb-2">
                                    <span className="text-sm text-gray-600">Harga Asli:</span>
                                    <span className="text-sm font-medium">{formatRupiah(selectedProduct.original_price || selectedProduct.price)}</span>
                                </div>
                                <div className="flex justify-between mb-2">
                                    <span className="text-sm text-gray-600">Diskon:</span>
                                    <span className="text-sm font-medium text-red-600">-{discountPercent}%</span>
                                </div>
                                <div className="flex justify-between pt-2 border-t border-gray-200">
                                    <span className="text-sm font-semibold text-gray-900">Harga Setelah Diskon:</span>
                                    <span className="text-lg font-bold text-red-600">
                                        {formatRupiah(Math.round((selectedProduct.original_price || selectedProduct.price) * (1 - discountPercent / 100) / 100) * 100)}
                                    </span>
                                </div>
                            </div>

                            <div className="flex gap-3">
                                <button
                                    onClick={() => {
                                        setShowApplyModal(false);
                                        setSelectedProduct(null);
                                    }}
                                    className="flex-1 btn-secondary"
                                >
                                    Batal
                                </button>
                                <button
                                    onClick={handleApplySubmit}
                                    className="flex-1 btn-primary"
                                >
                                    Terapkan
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Tier Modal */}
                {showTierModal && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                        <div className="bg-white rounded-2xl max-w-md w-full p-6">
                            <h3 className="text-2xl font-bold text-gray-900 mb-4">
                                {editingTier ? 'Edit' : 'Tambah'} Tier
                            </h3>

                            <form onSubmit={handleTierSubmit} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Nama Tier
                                    </label>
                                    <input
                                        type="text"
                                        value={tierForm.tier_name}
                                        onChange={(e) => setTierForm({ ...tierForm, tier_name: e.target.value })}
                                        className="input-field"
                                        required
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Min Terjual
                                        </label>
                                        <input
                                            type="number"
                                            value={tierForm.min_sold}
                                            onChange={(e) => setTierForm({ ...tierForm, min_sold: e.target.value })}
                                            className="input-field"
                                            required
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Max Terjual
                                        </label>
                                        <input
                                            type="number"
                                            value={tierForm.max_sold || ''}
                                            onChange={(e) => setTierForm({ ...tierForm, max_sold: e.target.value || null })}
                                            className="input-field"
                                            placeholder="Unlimited"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Persentase Diskon (%)
                                    </label>
                                    <input
                                        type="number"
                                        min="0"
                                        max="100"
                                        step="0.01"
                                        value={tierForm.discount_percent}
                                        onChange={(e) => setTierForm({ ...tierForm, discount_percent: e.target.value })}
                                        className="input-field"
                                        required
                                    />
                                </div>

                                <div className="flex items-center">
                                    <input
                                        type="checkbox"
                                        id="tier-active"
                                        checked={tierForm.is_active}
                                        onChange={(e) => setTierForm({ ...tierForm, is_active: e.target.checked })}
                                        className="w-4 h-4 text-primary-600 rounded"
                                    />
                                    <label htmlFor="tier-active" className="ml-2 text-sm text-gray-700">
                                        Tier Aktif
                                    </label>
                                </div>

                                <div className="flex gap-3 pt-4">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setShowTierModal(false);
                                            setEditingTier(null);
                                        }}
                                        className="flex-1 btn-secondary"
                                    >
                                        Batal
                                    </button>
                                    <button type="submit" className="flex-1 btn-primary">
                                        {editingTier ? 'Update' : 'Tambah'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* Confirm Dialogs - FIXED: Added onClose prop */}
                <ConfirmDialog
                    isOpen={removeDialog.isOpen}
                    title="Hapus Hot Deal?"
                    message={`Apakah Anda yakin ingin menghapus Hot Deal dari "${removeDialog.productName}"?`}
                    confirmText="Hapus"
                    cancelText="Batal"
                    onConfirm={confirmRemoveHotDeal}
                    onClose={() => setRemoveDialog({ isOpen: false, productId: null, productName: '' })}
                    type="danger"
                />

                <ConfirmDialog
                    isOpen={deleteTierDialog.isOpen}
                    title="Hapus Tier?"
                    message={`Apakah Anda yakin ingin menghapus tier "${deleteTierDialog.tierName}"?`}
                    confirmText="Hapus"
                    cancelText="Batal"
                    onConfirm={confirmDeleteTier}
                    onClose={() => setDeleteTierDialog({ isOpen: false, tierId: null, tierName: '' })}
                    type="danger"
                />
            </div>
        </AdminLayout>
    );
};

export default HotDeals;