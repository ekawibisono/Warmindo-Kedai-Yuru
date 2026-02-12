import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { publicAPI } from '../services/api';
import { useCustomerAuth } from '../contexts/CustomerAuthContext';
import Checkout from '../components/customer/Checkout';
import Cart from '../components/customer/Cart';
import CustomerHeader from '../components/customer/CustomerHeader';
import PopupBanner from '../components/customer/PopupBanner';
import Toast, { notify } from '../components/common/Toast';

const CustomerMenu = () => {
  // eslint-disable-next-line no-unused-vars
  const navigate = useNavigate();
  const { customer, updateCustomer } = useCustomerAuth();
  
  const [menu, setMenu] = useState({
    products: [],
    categories: [],
    modifier_groups: [],
    modifiers: [],
    product_modifier_groups: [],
    store_settings: {
      order_enabled: true,
      delivery_enabled: true
    }
  });
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedModifiers, setSelectedModifiers] = useState({});
  const [quantity, setQuantity] = useState(1);
  const [showCart, setShowCart] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [cart, setCart] = useState(() => {
    try {
      const savedCart = localStorage.getItem('cart');
      return savedCart ? JSON.parse(savedCart) : [];
    } catch (error) {
      return [];
    }
  });
  
  // Popup Banner States
  const [popupBanner, setPopupBanner] = useState(null);
  const [showPopupBanner, setShowPopupBanner] = useState(false);

  const fetchMenu = useCallback(async () => {
    try {
      setLoading(true);
      const response = await publicAPI.getMenu();
      setMenu(response.data);
    } catch (error) {
      notify.error('❌ Gagal memuat menu. Silakan refresh halaman.');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchPopupBanner = useCallback(async () => {
    try {
      const response = await publicAPI.getActivePopupBanner();
      const banner = response.data;
      
      if (banner && shouldShowPopupBanner(banner)) {
        setPopupBanner(banner);
        setShowPopupBanner(true);
      }
    } catch (error) {
      // Silent fail - popup banner is not critical
      console.log('No active popup banner');
    }
  }, []);

  useEffect(() => {
    fetchMenu();
    fetchPopupBanner();
  }, [fetchMenu, fetchPopupBanner]); // Only run once on mount

  useEffect(() => {
    localStorage.setItem('cart', JSON.stringify(cart));
  }, [cart]);

  const shouldShowPopupBanner = (banner) => {
    const storageKey = `popup_banner_${banner.id}`;
    const now = new Date().getTime();
    const lastShown = localStorage.getItem(storageKey);
    
    switch (banner.show_frequency) {
      case 'always':
        return true;
      case 'once_per_day':
        if (!lastShown) return true;
        const oneDay = 24 * 60 * 60 * 1000;
        return now - parseInt(lastShown) > oneDay;
      case 'once_per_session':
      default:
        return !sessionStorage.getItem(storageKey);
    }
  };

  const handleClosePopupBanner = () => {
    if (popupBanner) {
      const storageKey = `popup_banner_${popupBanner.id}`;
      const now = new Date().getTime();
      
      // Track banner viewing
      if (popupBanner.show_frequency === 'once_per_day') {
        localStorage.setItem(storageKey, now.toString());
      } else {
        sessionStorage.setItem(storageKey, 'shown');
      }
    }
    
    setShowPopupBanner(false);
    setPopupBanner(null);
  };

  const isStoreClosed = !menu.store_settings?.order_enabled;
  const isDeliveryDisabled = !menu.store_settings?.delivery_enabled;

  const isProductAvailable = (product) => {
    // Product must be active
    if (!product.is_active) return false;

    // If product has category, check if category is active
    if (product.category_id) {
      const category = menu.categories.find(c => c.id === product.category_id);
      if (category && !category.is_active) return false;
    }

    return true;
  };

  const getProductModifierGroups = (productId) => {
    const mappings = (menu.product_modifier_groups || [])
      .filter((pmg) => pmg.product_id === productId)
      .sort((a, b) => (a.position ?? 0) - (b.position ?? 0));

    return mappings
      .map((pmg) => menu.modifier_groups.find((g) => g.id === pmg.group_id))
      .filter(Boolean);
  };

  const getGroupModifiers = (groupId) => {
    return menu.modifiers.filter((m) => m.group_id === groupId);
  };

  const handleSelectProduct = (product) => {
    if (!isProductAvailable(product)) {
      notify.error('❌ Produk tidak tersedia saat ini');
      return;
    }

    setSelectedProduct(product);
    setSelectedModifiers({});
    setQuantity(1);
  };

  const handleModifierChange = (groupId, modifierId, checked) => {
    const group = menu.modifier_groups.find((g) => g.id === groupId);
    
    setSelectedModifiers((prev) => {
      const newModifiers = { ...prev };

      if (!newModifiers[groupId]) {
        newModifiers[groupId] = [];
      }

      if (group && group.selection_type === 'single') {
        newModifiers[groupId] = checked ? [modifierId] : [];
      } else {
        if (checked) {
          if (!newModifiers[groupId].includes(modifierId)) {
            newModifiers[groupId].push(modifierId);
          }
        } else {
          newModifiers[groupId] = newModifiers[groupId].filter((id) => id !== modifierId);
        }
      }

      return newModifiers;
    });
  };

  const calculateItemSubtotal = () => {
    if (!selectedProduct) return 0;

    const modifiersTotal = Object.values(selectedModifiers)
      .flat()
      .reduce((total, modifierId) => {
        const modifier = menu.modifiers.find((m) => m.id === modifierId);
        return total + (modifier ? modifier.price : 0);
      }, 0);

    return (selectedProduct.price + modifiersTotal) * quantity;
  };

  const canAddToCart = () => {
    if (!selectedProduct) return false;

    const requiredGroups = getProductModifierGroups(selectedProduct.id).filter(
      (group) => group.is_required
    );

    return requiredGroups.every((group) => {
      const selectedInGroup = selectedModifiers[group.id] || [];
      return selectedInGroup.length > 0;
    });
  };

  const addToCart = () => {
    if (!canAddToCart()) {
      notify.error('❌ Silakan pilih modifier yang wajib');
      return;
    }

    const cartItem = {
      id: `${selectedProduct.id}_${Date.now()}`,
      product_id: selectedProduct.id,
      category_id: selectedProduct.category_id, // Add category_id for discount validation
      product_name: selectedProduct.name,
      base_price: selectedProduct.price,
      price: selectedProduct.price, // Add price field for discount validation
      quantity,
      modifiers: Object.values(selectedModifiers)
        .flat()
        .map((modifierId) => {
          const modifier = menu.modifiers.find((m) => m.id === modifierId);
          return {
            id: modifier.id,
            name: modifier.name,
            price: modifier.price
          };
        }),
      subtotal: calculateItemSubtotal()
    };

    setCart((prev) => [...prev, cartItem]);
    setSelectedProduct(null);
    setSelectedModifiers({});
    setQuantity(1);

  };

  const removeFromCart = (itemId) => {
    setCart((prev) => prev.filter((item) => item.id !== itemId));
  };

  const updateCartItemQty = (itemId, newQty) => {
    if (newQty <= 0) {
      removeFromCart(itemId);
      return;
    }

    setCart((prev) =>
      prev.map((item) =>
        item.id === itemId
          ? {
              ...item,
              quantity: newQty,
              subtotal: (item.base_price + item.modifiers.reduce((acc, mod) => acc + mod.price, 0)) * newQty
            }
          : item
      )
    );
  };

  const handleOpenCheckout = () => {
    if (cart.length === 0) {
      notify.error('❌ Keranjang kosong');
      return;
    }
    setShowCheckout(true);
  };

  const handleCheckoutSuccess = (orderData) => {
    // Clear cart immediately when order is successful
    setCart([]);
    localStorage.setItem('cart', JSON.stringify([])); // Ensure localStorage is also cleared
    setShowCheckout(false);

    // Update local customer stats so header reflects new total orders immediately
    if (customer) {
      updateCustomer({ ...customer, total_orders: (customer.total_orders || 0) + 1 });
    }

    // Show success notification
    // notify.success('✅ Pesanan berhasil dibuat! Cart dikosongkan.');

    setTimeout(() => {
      if (orderData?.tracking_url) {
        window.open(orderData.tracking_url, '_blank');
      }
    }, 2000);
  };

  const handleBackToMenu = () => {
    // Only close checkout modal, keep cart items intact
    setShowCheckout(false);
    // Do NOT clear cart when user cancels checkout
  };

  const formatRupiah = (number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(number);
  };

  // Get hot deals products
  const hotDealsProducts = menu.products.filter(p => p.is_active && p.is_hot_deal);

  // Filter products
  const filteredProducts = menu.products
    .filter(p => {
      // Category filter
      if (selectedCategory === 'all') return true;
      if (selectedCategory === 'hot-deals') return p.is_hot_deal;
      return p.category_id === selectedCategory;
    })
    .filter(p =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.description?.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      // Sort by total sold (descending) for "all" category, otherwise by name
      if (selectedCategory === 'all') {
        if (b.total_sold !== a.total_sold) {
          return b.total_sold - a.total_sold; // Highest sold first
        }
        return a.name.localeCompare(b.name); // Then alphabetical
      }
      return a.name.localeCompare(b.name); // Default: alphabetical
    });

  // Get active categories
  const activeCategories = menu.categories.filter(c =>
    menu.products.some(p => p.category_id === c.id)
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-primary-500 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Memuat menu...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex flex-col">
      {/* Integrated Header with search and filters */}
      <CustomerHeader 
        cart={cart}
        onShowCart={() => setShowCart(true)}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        categories={activeCategories}
        hotDealsProducts={hotDealsProducts}
        selectedCategory={selectedCategory}
        onCategoryChange={setSelectedCategory}
      />

      {/* Store Closed Banner */}
      {isStoreClosed && (
        <div className="bg-red-600 text-white">
          <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6">
            <div className="flex items-center justify-center space-x-3">
              <svg className="w-6 h-6 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div className="text-center">
                <p className="font-bold text-lg">🔒 Toko Sedang Tutup</p>
                <p className="text-red-100 text-sm">Maaf, saat ini kami tidak menerima pesanan. Silakan coba lagi nanti.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delivery Disabled Banner */}
      {!isStoreClosed && isDeliveryDisabled && (
        <div className="bg-yellow-500 text-yellow-900">
          <div className="max-w-7xl mx-auto px-4 py-3 sm:px-6">
            <div className="flex items-center justify-center space-x-2">
              <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
              </svg>
              <p className="font-medium text-sm">⚠️ Layanan Delivery sedang tidak tersedia. Hanya tersedia Pickup.</p>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {/* Results Info */}
          {searchQuery && (
            <div className="mb-6 text-center">
              <p className="text-gray-600">
                Ditemukan <span className="font-semibold">{filteredProducts.length}</span> hasil untuk "{searchQuery}"
                {selectedCategory === 'all' && <span className="text-sm text-gray-500 block mt-1">🔥 Diurutkan berdasarkan penjualan terbanyak</span>}
              </p>
            </div>
          )}

          {/* Products Grid */}
          <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
            {filteredProducts.map((product) => {
              const isAvailable = isProductAvailable(product);
              return (
                <div key={product.id} className={`group relative rounded-2xl shadow-md transition-all duration-300 overflow-hidden border flex flex-col ${
                  isAvailable 
                    ? 'bg-white hover:shadow-xl transform hover:-translate-y-1 border-gray-100' 
                    : 'bg-gray-50 border-gray-200 opacity-75'
                }`}>
                {/* Hot Deal Badge */}
                {product.is_hot_deal && isAvailable && (
                  <div className="absolute top-3 left-3 z-10">
                    <div className="bg-gradient-to-r from-red-500 to-red-600 text-white px-2 py-1 rounded-full text-xs font-bold shadow-lg">
                      🔥 Hot Deal
                    </div>
                  </div>
                )}

                {/* Sales Badge */}
                {product.total_sold > 0 && (
                  <div className="absolute top-3 right-3 z-10">
                    <div className="bg-gradient-to-r from-green-500 to-green-600 text-white px-2 py-1 rounded-full text-xs font-bold shadow-lg">
                      Terjual {product.total_sold}
                    </div>
                  </div>
                )}

                {/* Product Image */}
                <div className={`relative h-32 sm:h-48 overflow-hidden ${
                  isAvailable ? 'bg-gray-100' : 'bg-gray-200'
                }`}>
                  {product.image_url ? (
                    <img
                      src={product.image_url}
                      alt={product.name}
                      className={`w-full h-full object-cover transition-transform duration-300 ${
                        isAvailable ? 'group-hover:scale-105' : 'grayscale'
                      }`}
                      onError={(e) => {
                        e.target.style.display = 'none';
                        e.target.parentNode.querySelector('.image-placeholder').style.display = 'flex';
                      }}
                      onLoad={(e) => {
                        e.target.parentNode.querySelector('.image-placeholder')?.style.setProperty('display', 'none');
                      }}
                    />
                  ) : null}
                  
                  {/* Image Placeholder - always present as fallback */}
                  <div className={`image-placeholder w-full h-full flex items-center justify-center bg-gradient-to-br absolute inset-0 ${
                    isAvailable ? 'from-gray-100 to-gray-200' : 'from-gray-200 to-gray-300'
                  }`} style={{ display: product.image_url ? 'none' : 'flex' }}>
                    <div className="text-center">
                      <svg className={`w-8 sm:w-12 h-8 sm:h-12 mx-auto mb-1 sm:mb-2 ${
                        isAvailable ? 'text-gray-400' : 'text-gray-500'
                      }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <p className={`text-xs font-medium ${
                        isAvailable ? 'text-gray-500' : 'text-gray-600'
                      }`}>
                        {product.image_url ? 'Gambar tidak dapat dimuat' : product.name}
                      </p>
                    </div>
                  </div>
                  
                  {/* Availability Overlay */}
                  {!isAvailable && (
                    <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center">
                      <div className="text-white text-center bg-black bg-opacity-60 rounded-lg px-3 py-2">
                        <svg className="w-6 h-6 mx-auto mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L18.364 5.636" />
                        </svg>
                        <p className="text-xs font-medium">Tidak Tersedia</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Product Info */}
                <div className="p-3 sm:p-4 flex-1 flex flex-col">
                  <div className="flex-1">
                    <h3 className={`font-bold text-sm sm:text-lg mb-1 sm:mb-2 transition-colors line-clamp-1 ${
                      isAvailable 
                        ? 'text-gray-900 group-hover:text-primary-600' 
                        : 'text-gray-500'
                    }`}>
                      {product.name}
                    </h3>
                    
                    {product.description && (
                      <p className={`text-xs sm:text-sm mb-2 sm:mb-3 line-clamp-1 sm:line-clamp-2 ${
                        isAvailable ? 'text-gray-600' : 'text-gray-500'
                      }`}>
                        {product.description}
                      </p>
                    )}
                  </div>

                  {/* Price and Button Container - Always at bottom */}
                  <div className="mt-auto pt-2">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-2">
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm sm:text-xl lg:text-2xl font-bold truncate ${
                          isAvailable ? 'text-primary-600' : 'text-gray-400'
                        }`}>
                          {formatRupiah(product.price)}
                        </p>
                        {!isAvailable && (
                          <p className="text-xs text-red-500 font-medium mt-1 leading-relaxed">
                            {!product.is_active ? 'Produk Nonaktif' : 'Kategori Nonaktif'}
                          </p>
                        )}
                      </div>

                      <button
                        onClick={() => isAvailable && handleSelectProduct(product)}
                        disabled={!isAvailable || isStoreClosed}
                        className={`w-full sm:w-auto flex-shrink-0 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm lg:text-base font-medium transition-all duration-200 shadow-md ${
                          isStoreClosed 
                            ? 'bg-gray-400 text-white cursor-not-allowed'
                            : isAvailable 
                              ? 'bg-primary-600 hover:bg-primary-700 text-white transform hover:scale-105 active:scale-95 hover:shadow-lg'
                              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        }`}
                      >
                        {isStoreClosed 
                          ? 'Tutup' 
                          : isAvailable 
                            ? 'Pilih' 
                            : 'Tidak Tersedia'
                        }
                      </button>
                    </div>
                  </div>
                </div>
              </div>
              );
            })}
          </div>

          {filteredProducts.length === 0 && !loading && (
            <div className="text-center py-16">
              <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-700 mb-2">Produk tidak ditemukan</h3>
              <p className="text-gray-500 mb-6">Coba ubah kata kunci pencarian atau pilih kategori lain</p>
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('all');
                }}
                className="bg-primary-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-primary-700 transition-colors"
              >
                Tampilkan Semua Menu
              </button>
            </div>
          )}
        </div>
      </main>

      {/* Product Detail Modal */}
      {selectedProduct && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-auto">
            {/* Modal Header */}
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 rounded-t-2xl">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-gray-900">{selectedProduct.name}</h2>
                <button
                  onClick={() => setSelectedProduct(null)}
                  className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-6">
              {/* Product Image */}
              {selectedProduct.image_url && (
                <div className="w-full h-64 bg-gray-100 rounded-lg mb-4 overflow-hidden">
                  <img
                    src={selectedProduct.image_url}
                    alt={selectedProduct.name}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}

              {/* Product Description */}
              {selectedProduct.description && (
                <p className="text-gray-600 mb-4">{selectedProduct.description}</p>
              )}

              {/* Base Price */}
              <div className="bg-primary-50 border border-primary-200 rounded-lg p-4 mb-6">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-medium text-gray-700">Harga Dasar:</span>
                  <span className="text-2xl font-bold text-primary-600">{formatRupiah(selectedProduct.price)}</span>
                </div>
              </div>

              {/* Modifier Groups */}
              {getProductModifierGroups(selectedProduct.id).map((group) => (
                <div key={group.id} className="mb-6 border border-gray-200 rounded-lg p-4">
                  <div className="mb-3">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {group.name}
                      {group.is_required && <span className="text-red-500 ml-1">*</span>}
                    </h3>
                    <p className="text-sm text-gray-500">
                      {group.selection_type === 'single' ? 'Pilih satu' : 'Bisa pilih beberapa'}
                      {group.is_required && ' - Wajib dipilih'}
                    </p>
                  </div>
                  <div className="space-y-2">
                    {getGroupModifiers(group.id).map((modifier) => (
                      <label
                        key={modifier.id}
                        className="flex items-center p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                      >
                        <input
                          type={group.selection_type === 'single' ? 'radio' : 'checkbox'}
                          name={`group_${group.id}`}
                          checked={(selectedModifiers[group.id] || []).includes(modifier.id)}
                          onChange={(e) => handleModifierChange(group.id, modifier.id, e.target.checked)}
                          className="mr-3 text-primary-600 focus:ring-primary-500"
                        />
                        <div className="flex-1">
                          <div className="flex justify-between items-center">
                            <span className="font-medium text-gray-900">{modifier.name}</span>
                            <span className="font-semibold text-primary-600">
                              {modifier.price > 0 ? `+${formatRupiah(modifier.price)}` : 'Gratis'}
                            </span>
                          </div>
                          {modifier.description && (
                            <p className="text-sm text-gray-500 mt-1">{modifier.description}</p>
                          )}
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              ))}

              {/* Quantity Selector */}
              <div className="mb-6 bg-gray-50 border border-gray-200 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Jumlah</h3>
                <div className="flex items-center space-x-4">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="w-10 h-10 bg-white border border-gray-300 rounded-full flex items-center justify-center text-gray-600 hover:bg-gray-100 transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                    </svg>
                  </button>
                  <span className="text-xl font-semibold text-gray-900 w-8 text-center">{quantity}</span>
                  <button
                    onClick={() => setQuantity(quantity + 1)}
                    className="w-10 h-10 bg-white border border-gray-300 rounded-full flex items-center justify-center text-gray-600 hover:bg-gray-100 transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 rounded-b-2xl">
              <div className="flex justify-between items-center mb-4">
                <span className="text-lg font-semibold text-gray-700">Total:</span>
                <span className="text-2xl font-bold text-primary-600">{formatRupiah(calculateItemSubtotal())}</span>
              </div>
              <button
                onClick={addToCart}
                disabled={!canAddToCart()}
                className="w-full bg-primary-600 hover:bg-primary-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white py-3 px-6 rounded-lg font-semibold transition-all duration-200 shadow-lg hover:shadow-xl"
              >
                {canAddToCart() ? 'Tambahkan ke Keranjang' : 'Pilih tanda bintang yang wajib'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cart Modal */}
      {showCart && (
        <Cart
          cart={cart}
          onClose={() => setShowCart(false)}
          onUpdateQty={updateCartItemQty}
          onRemove={removeFromCart}
          onCheckout={handleOpenCheckout}
          formatRupiah={formatRupiah}
        />
      )}

      {/* Checkout Modal */}
      {showCheckout && (
        <Checkout
          cart={cart}
          onClose={handleBackToMenu}
          onSuccess={handleCheckoutSuccess}
          isDeliveryDisabled={isDeliveryDisabled}
        />
      )}

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-auto">
        <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            {/* Copyright */}
            <p className="text-sm text-gray-500">
              © 2026 Kedai Yuru X Ucup System
            </p>

            {/* WhatsApp Contact */}
            <a
              href={`https://wa.me/${process.env.REACT_APP_WHATSAPP_NUMBER || '6282324975131'}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm text-gray-600 hover:text-green-600 transition-colors group"
            >
              <span>Butuh Bantuan? Hubungi kami</span>
              <svg
                className="w-5 h-5 text-green-500 group-hover:text-green-600 transition-colors"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
              </svg>
            </a>
          </div>
        </div>
      </footer>

      {/* Popup Banner Modal */}
      {showPopupBanner && popupBanner && (
        <PopupBanner
          banner={popupBanner}
          onClose={handleClosePopupBanner}
        />
      )}

      <Toast />
    </div>
  );
};

export default CustomerMenu;