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
        warningMessage: '',
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
        // Show confirmation dialog first
        const activeTiers = tiers.filter(t => t.is_active);
        
        let confirmMessage;
        if (activeTiers.length === 0) {
            // No active tiers - will remove all hot deals
            confirmMessage = `Tidak ada tier aktif. Sistem akan menghapus SEMUA Hot Deals yang ada.\n\nLanjutkan menghapus semua Hot Deals?`;
        } else {
            // Has active tiers - will apply them
            confirmMessage = `Sistem akan otomatis menerapkan tier ke semua produk berdasarkan jumlah terjual:\n\n${activeTiers.map(t => 
                `• ${t.tier_name}: ${t.min_sold}${t.max_sold ? `-${t.max_sold}` : '+'} terjual → ${t.discount_percent}% diskon`
            ).join('\n')}\n\nLanjutkan?`;
        }

        if (!window.confirm(confirmMessage)) {
            return;
        }

        try {
            setLoading(true);
            const response = await staffAPI.updateHotDealsAuto();
            
            if (activeTiers.length === 0) {
                notify.success('Semua Hot Deals berhasil dihapus karena tidak ada tier aktif');
            } else {
                notify.success(response.data.message || 'Hot Deals berhasil diupdate otomatis berdasarkan tier');
            }
            
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
        // Check if this will be the last active tier
        const activeCount = tiers.filter(t => t.is_active && t.id !== tier.id).length;
        const hasHotDeals = hotDealsProducts.length > 0;
        
        let warningMessage = `Apakah Anda yakin ingin menghapus tier "${tier.tier_name}"?`;
        
        if (activeCount === 0 && hasHotDeals) {
            warningMessage += `\n\n⚠️ PERINGATAN: Ini adalah tier aktif terakhir dan masih ada ${hotDealsProducts.length} produk Hot Deals. Setelah tier dihapus, semua Hot Deals akan otomatis dihapus juga.`;
        }

        setDeleteTierDialog({
            isOpen: true,
            tierId: tier.id,
            tierName: tier.tier_name,
            warningMessage: warningMessage,
        });
    };

    const confirmDeleteTier = async () => {
        try {
            await staffAPI.deleteHotDealTier(deleteTierDialog.tierId);
            notify.success(`Tier "${deleteTierDialog.tierName}" berhasil dihapus`);
            
            // Refresh data terlebih dahulu untuk mendapatkan tier terbaru
            await fetchData();
            
            // Check if there are any active tiers left after the deletion
            const updatedTiersRes = await staffAPI.getHotDealTiers();
            const activeTiers = (updatedTiersRes.data || []).filter(t => t.is_active);
            
            if (activeTiers.length === 0) {
                // No active tiers left, automatically update hot deals to remove all
                notify.info('Tidak ada tier aktif tersisa. Menghapus semua Hot Deals...');
                
                try {
                    // Force update without tier validation
                    await staffAPI.updateHotDealsAuto();
                    notify.success('Semua Hot Deals telah dihapus karena tidak ada tier aktif');
                    await fetchData(); // Refresh again to show updated state
                } catch (error) {
                    console.error('Error auto updating after tier deletion:', error);
                    notify.warning('Tier dihapus, silakan klik "Update Otomatis" untuk menghapus Hot Deals yang tersisa');
                }
            }
            
            setDeleteTierDialog({ isOpen: false, tierId: null, tierName: '', warningMessage: '' });
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
                <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4">
                    <div className="flex-1">
                        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center gap-2 sm:gap-3">
                            🔥 <span className="hidden sm:inline">Hot Deals Management</span>
                            <span className="sm:hidden">Hot Deals</span>
                        </h1>
                        <p className="text-gray-600 mt-1 sm:mt-2 text-sm sm:text-base">
                            <span className="hidden sm:inline">Kelola produk Hot Deals dan pengaturan tier diskon otomatis</span>
                            <span className="sm:hidden">Kelola Hot Deals & tier</span>
                        </p>
                    </div>
                    <div className="flex flex-col sm:flex-row lg:flex-col lg:items-end gap-3">
                        <button
                            onClick={handleAutoUpdate}
                            className="btn-primary flex items-center justify-center gap-2 shadow-lg text-sm sm:text-base"
                            disabled={loading}
                        >
                            <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                            {loading ? 'Memproses...' : 'Update Otomatis'}
                        </button>
                        <p className="text-xs text-gray-500 text-center sm:text-right lg:text-right max-w-sm">
                            💡 <span className="hidden sm:inline">Klik untuk menerapkan tier secara otomatis ke semua produk berdasarkan jumlah terjual</span>
                            <span className="sm:hidden">Auto-apply tier ke semua produk</span>
                        </p>
                    </div>
                </div>

                {/* Statistics Cards */}
                {stats && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                        <div className="card bg-gradient-to-br from-red-500 to-red-600 text-white">
                            <div className="flex items-start justify-between">
                                <div className="flex-1 min-w-0">
                                    <p className="text-red-100 text-sm">Total Hot Deals</p>
                                    <h3 className="text-2xl sm:text-3xl font-bold mt-2 break-words">{stats.total_hot_deals}</h3>
                                    <p className="text-red-100 text-xs mt-1">dari {stats.total_products} produk</p>
                                </div>
                                <div className="bg-white bg-opacity-20 p-3 rounded-lg">
                                    <span className="text-3xl">🔥</span>
                                </div>
                            </div>
                        </div>

                        <div className="card bg-gradient-to-br from-orange-500 to-orange-600 text-white">
                            <div className="flex items-start justify-between">
                                <div className="flex-1 min-w-0">
                                    <p className="text-orange-100 text-sm">Rata-rata Diskon</p>
                                    <h3 className="text-2xl sm:text-3xl font-bold mt-2 break-words">{stats.average_discount}%</h3>
                                    <p className="text-orange-100 text-xs mt-1">persentase diskon</p>
                                </div>
                                <div className="bg-white bg-opacity-20 p-3 rounded-lg">
                                    <span className="text-3xl">%</span>
                                </div>
                            </div>
                        </div>

                        <div className="card bg-gradient-to-br from-green-500 to-green-600 text-white">
                            <div className="flex items-start justify-between">
                                <div className="flex-1 min-w-0">
                                    <p className="text-green-100 text-sm">Total Terjual</p>
                                    <h3 className="text-2xl sm:text-3xl font-bold mt-2 break-words">{stats.total_sold_hot_deals}</h3>
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
                                <div className="flex-1 min-w-0">
                                    <p className="text-blue-100 text-sm">Total Hemat/Item</p>
                                    <h3 className="text-lg sm:text-2xl font-bold mt-2 break-words">{formatRupiah(stats.total_savings_per_item)}</h3>
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
                <div className="border-b border-gray-200 overflow-x-auto">
                    <nav className="-mb-px flex space-x-4 sm:space-x-8 min-w-max">
                        <button
                            onClick={() => setActiveTab('products')}
                            className={`py-3 sm:py-4 px-2 sm:px-1 border-b-2 font-medium text-xs sm:text-sm whitespace-nowrap ${activeTab === 'products'
                                    ? 'border-primary-500 text-primary-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                }`}
                        >
                            📦 <span className="hidden sm:inline">Produk </span>Hot Deals
                        </button>
                        <button
                            onClick={() => setActiveTab('tiers')}
                            className={`py-3 sm:py-4 px-2 sm:px-1 border-b-2 font-medium text-xs sm:text-sm whitespace-nowrap ${activeTab === 'tiers'
                                    ? 'border-primary-500 text-primary-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                }`}
                        >
                            ⚙️ <span className="hidden sm:inline">Pengaturan </span>Tier
                        </button>
                    </nav>
                </div>

                {/* Products Tab */}
                {activeTab === 'products' && (
                    <div className="space-y-6">
                        {/* Warning if no active tiers but hot deals exist */}
                        {hotDealsProducts.length > 0 && tiers.filter(t => t.is_active).length === 0 && (
                            <div className="card border-amber-200 bg-amber-50">
                                <div className="flex items-start gap-3">
                                    <div className="flex-shrink-0">
                                        <svg className="w-6 h-6 text-amber-600" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                        </svg>
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="text-sm font-medium text-amber-800 mb-1">
                                            ⚠️ Peringatan: Tidak Ada Tier Aktif
                                        </h3>
                                        <p className="text-sm text-amber-700 mb-3">
                                            Masih ada <strong>{hotDealsProducts.length} produk Hot Deals</strong> aktif, tapi tidak ada tier yang dikonfigurasi. 
                                            Hot Deals ini tidak akan ter-update otomatis.
                                        </p>
                                        <button 
                                            onClick={handleAutoUpdate}
                                            className="btn-warning text-sm"
                                        >
                                            🔄 Update Sekarang untuk Menghapus Hot Deals
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Active Hot Deals */}
                        <div className="card">
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-lg sm:text-xl font-bold text-gray-900">
                                    🔥 <span className="hidden sm:inline">Produk </span>Hot Deals Aktif ({hotDealsProducts.length})
                                </h2>
                            </div>

                            {hotDealsProducts.length > 0 ? (
                                <>
                                    {/* Mobile Card View */}
                                    <div className="block lg:hidden space-y-4">
                                        {hotDealsProducts.map((product) => (
                                            <div key={product.id} className="border rounded-lg p-4 bg-white shadow-sm">
                                                <div className="flex items-start gap-3 mb-3">
                                                    {product.image_url && (
                                                        <img src={product.image_url} alt={product.name} className="w-16 h-16 rounded-lg object-cover flex-shrink-0" />
                                                    )}
                                                    <div className="flex-1 min-w-0">
                                                        <h3 className="font-semibold text-gray-900 text-sm truncate">{product.name}</h3>
                                                        <p className="text-xs text-gray-500 mb-2">{product.category_name}</p>
                                                        <div className="flex items-center gap-2">
                                                            <span className="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                                                                {product.discount_percent}% OFF
                                                            </span>
                                                            <span className="text-xs text-gray-600">Terjual: {product.total_sold || 0}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="grid grid-cols-2 gap-3 text-xs mb-3">
                                                    <div>
                                                        <span className="text-gray-500">Harga Asli:</span>
                                                        <div className="font-medium text-gray-500 line-through">
                                                            {formatRupiah(product.original_price || 0)}
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <span className="text-gray-500">Harga Diskon:</span>
                                                        <div className="font-bold text-red-600">
                                                            {formatRupiah(product.price)}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => handleApplyHotDeal(product)}
                                                        className="flex-1 btn-secondary text-xs py-2"
                                                    >
                                                        Edit
                                                    </button>
                                                    <button
                                                        onClick={() => handleRemoveHotDeal(product)}
                                                        className="flex-1 bg-red-100 text-red-700 hover:bg-red-200 px-3 py-2 rounded-lg text-xs font-medium transition-colors"
                                                    >
                                                        Hapus
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    
                                    {/* Desktop Table View */}
                                    <div className="hidden lg:block overflow-x-auto">
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
                                </>
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
                                <h2 className="text-lg sm:text-xl font-bold text-gray-900">
                                    📦 Produk Tersedia ({nonHotDealsProducts.length})
                                </h2>
                            </div>

                            {nonHotDealsProducts.length > 0 ? (
                                <>
                                    {/* Mobile Card View */}
                                    <div className="block lg:hidden space-y-3">
                                        {nonHotDealsProducts.map((product) => (
                                            <div key={product.id} className="border rounded-lg p-4 bg-white shadow-sm">
                                                <div className="flex items-start gap-3 mb-3">
                                                    {product.image_url && (
                                                        <img src={product.image_url} alt={product.name} className="w-14 h-14 rounded-lg object-cover flex-shrink-0" />
                                                    )}
                                                    <div className="flex-1 min-w-0">
                                                        <h3 className="font-medium text-gray-900 text-sm truncate">{product.name}</h3>
                                                        <p className="text-xs text-gray-500 mb-1">{product.category_name}</p>
                                                        <div className="flex items-center justify-between">
                                                            <span className="font-semibold text-gray-900 text-sm">{formatRupiah(product.price)}</span>
                                                            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                                                                product.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                                                            }`}>
                                                                {product.is_active ? 'Aktif' : 'Nonaktif'}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex justify-between items-center">
                                                    <span className="text-xs text-gray-500">Terjual: {product.total_sold || 0}</span>
                                                    <button
                                                        onClick={() => handleApplyHotDeal(product)}
                                                        className="btn-primary text-xs py-2 px-3"
                                                    >
                                                        + Hot Deal
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    
                                    {/* Desktop Table View */}
                                    <div className="hidden lg:block overflow-x-auto">
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
                                </>
                            ) : (
                                <div className="text-center py-8 sm:py-12 text-gray-500">
                                    <p className="text-sm sm:text-base">Semua produk sudah menjadi Hot Deals!</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Tiers Tab */}
                {activeTab === 'tiers' && (
                    <div className="card">
                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4 mb-6">
                            <div className="flex-1">
                                <h2 className="text-lg sm:text-xl font-bold text-gray-900">Pengaturan Tier Diskon</h2>
                                <p className="text-sm text-gray-600 mt-1">
                                    <span className="hidden sm:inline">Setup tier diskon berdasarkan jumlah terjual, lalu klik "Update Otomatis" untuk menerapkan</span>
                                    <span className="sm:hidden">Setup tier berdasarkan jumlah terjual</span>
                                </p>
                                {tiers.length > 0 && tiers.some(t => t.is_active) && (
                                    <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                        <div className="flex items-center gap-2 text-blue-800 text-sm">
                                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                                            </svg>
                                            <span className="font-medium">Tier siap digunakan!</span>
                                        </div>
                                        <p className="text-blue-700 text-xs mt-1">
                                            Klik tombol "Update Otomatis" di atas untuk menerapkan tier ke semua produk secara otomatis.
                                        </p>
                                    </div>
                                )}
                            </div>
                            <button onClick={handleAddTier} className="btn-primary text-sm sm:text-base whitespace-nowrap">
                                + <span className="hidden sm:inline">Tambah </span>Tier
                            </button>
                        </div>

                        {tiers.length > 0 ? (
                            <>
                                {/* Mobile Card View */}
                                <div className="block lg:hidden space-y-4">
                                    {tiers.map((tier) => (
                                        <div key={tier.id} className="border rounded-lg p-4 bg-white shadow-sm">
                                            <div className="flex justify-between items-start mb-3">
                                                <div>
                                                    <h3 className="font-bold text-gray-900">{tier.tier_name}</h3>
                                                    <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full mt-1 ${
                                                        tier.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                                                    }`}>
                                                        {tier.is_active ? 'Aktif' : 'Nonaktif'}
                                                    </span>
                                                </div>
                                                <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-orange-100 text-orange-800">
                                                    {tier.discount_percent}%
                                                </span>
                                            </div>
                                            <div className="grid grid-cols-2 gap-3 text-sm mb-3">
                                                <div>
                                                    <span className="text-gray-500 text-xs">Min Terjual:</span>
                                                    <div className="font-medium text-gray-900">{tier.min_sold}</div>
                                                </div>
                                                <div>
                                                    <span className="text-gray-500 text-xs">Max Terjual:</span>
                                                    <div className="font-medium text-gray-900">{tier.max_sold || '∞'}</div>
                                                </div>
                                            </div>
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => handleEditTier(tier)}
                                                    className="flex-1 btn-secondary text-xs py-2"
                                                >
                                                    Edit
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteTier(tier)}
                                                    className="flex-1 bg-red-100 text-red-700 hover:bg-red-200 px-3 py-2 rounded-lg text-xs font-medium transition-colors"
                                                >
                                                    Hapus
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                
                                {/* Desktop Table View */}
                                <div className="hidden lg:block overflow-x-auto">
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
                            </>
                        ) : (
                            <div className="text-center py-8 sm:py-12 px-4">
                                <div className="text-4xl sm:text-6xl mb-4">⚙️</div>
                                <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-2">Belum ada tier yang dikonfigurasi</h3>
                                <p className="text-gray-600 text-sm sm:text-base mb-6 max-w-md mx-auto">
                                    Setup tier untuk mengotomatisasi Hot Deals berdasarkan jumlah produk terjual
                                </p>
                                
                                <div className="bg-gray-50 rounded-xl p-4 sm:p-6 mb-6 text-left max-w-lg mx-auto">
                                    <h4 className="font-medium text-gray-900 mb-3 text-sm sm:text-base">📋 Cara Setup Tier Otomatis:</h4>
                                    <ol className="text-xs sm:text-sm text-gray-600 space-y-2">
                                        <li className="flex gap-2">
                                            <span className="text-blue-600 font-medium">1.</span>
                                            <span>Klik "Tambah Tier Pertama" di bawah</span>
                                        </li>
                                        <li className="flex gap-2">
                                            <span className="text-blue-600 font-medium">2.</span>
                                            <span>Isi data tier (contoh: Bronze, min 10 terjual, diskon 5%)</span>
                                        </li>
                                        <li className="flex gap-2">
                                            <span className="text-blue-600 font-medium">3.</span>
                                            <span>Pastikan tier "Aktif" ✅</span>
                                        </li>
                                        <li className="flex gap-2">
                                            <span className="text-blue-600 font-medium">4.</span>
                                            <span><strong>Klik "Update Otomatis"</strong> untuk menerapkan ke semua produk</span>
                                        </li>
                                    </ol>
                                    
                                    <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                                        <p className="text-green-800 text-xs">
                                            💡 <strong>Hasil:</strong> Produk dengan jumlah terjual sesuai tier akan otomatis mendapat diskon tanpa perlu setting manual!
                                        </p>
                                    </div>
                                </div>
                                
                                <button onClick={handleAddTier} className="btn-primary">
                                    Tambah Tier Pertama
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {/* Apply Hot Deal Modal */}
                {showApplyModal && selectedProduct && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                        <div className="bg-white rounded-2xl max-w-md w-full p-4 sm:p-6 mx-4">
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
                        <div className="bg-white rounded-2xl max-w-md w-full p-4 sm:p-6 mx-4 max-h-[90vh] overflow-y-auto">
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
                    message={deleteTierDialog.warningMessage || `Apakah Anda yakin ingin menghapus tier "${deleteTierDialog.tierName}"?`}
                    confirmText="Hapus"
                    cancelText="Batal"
                    onConfirm={confirmDeleteTier}
                    onClose={() => setDeleteTierDialog({ isOpen: false, tierId: null, tierName: '', warningMessage: '' })}
                    type="danger"
                />
            </div>
        </AdminLayout>
    );
};

export default HotDeals;