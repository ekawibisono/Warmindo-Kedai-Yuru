import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { publicAPI } from '../services/api';
import Checkout from '../components/customer/Checkout';
import Cart from '../components/customer/Cart';

const CustomerMenu = () => {
  // eslint-disable-next-line no-unused-vars
  const navigate = useNavigate();
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

  useEffect(() => {
    fetchMenu();
  }, []);

  useEffect(() => {
    localStorage.setItem('cart', JSON.stringify(cart));
  }, [cart]);

  const fetchMenu = async () => {
    try {
      const response = await publicAPI.getMenu();
      setMenu({
        ...response.data,
        store_settings: response.data.store_settings || {
          order_enabled: true,
          delivery_enabled: true
        }
      });
    } catch (error) {
      console.error('Error fetching menu:', error);
      alert('Gagal memuat menu');
    } finally {
      setLoading(false);
    }
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
    return menu.modifiers.filter(m => m.group_id === groupId && m.is_active);
  };

  const handleSelectProduct = (product) => {
    if (isStoreClosed) {
      alert('Maaf, toko sedang tutup. Silakan coba lagi nanti.');
      return;
    }

    if (!isProductAvailable(product)) {
      alert('Maaf, produk ini sedang tidak tersedia.');
      return;
    }

    setSelectedProduct(product);
    setSelectedModifiers({});
    setQuantity(1);
  };

  const handleModifierChange = (groupId, modifierId, checked) => {
    const group = menu.modifier_groups.find(g => g.id === groupId);

    if (group.selection_type === 'single') {
      setSelectedModifiers({
        ...selectedModifiers,
        [groupId]: checked ? [modifierId] : []
      });
    } else {
      const current = selectedModifiers[groupId] || [];
      if (checked) {
        if (current.length < group.max_select) {
          setSelectedModifiers({
            ...selectedModifiers,
            [groupId]: [...current, modifierId]
          });
        }
      } else {
        setSelectedModifiers({
          ...selectedModifiers,
          [groupId]: current.filter(id => id !== modifierId)
        });
      }
    }
  };

  const calculateItemSubtotal = () => {
    if (!selectedProduct) return 0;

    const modifiers = [];
    Object.entries(selectedModifiers).forEach(([groupId, modifierIds]) => {
      modifierIds.forEach(modId => {
        const modifier = menu.modifiers.find(m => m.id === modId);
        if (modifier) {
          modifiers.push(modifier);
        }
      });
    });

    const modifiersTotal = modifiers.reduce((sum, m) => sum + m.price_delta, 0);
    return (selectedProduct.price + modifiersTotal) * quantity;
  };

  const canAddToCart = () => {
    if (!selectedProduct) return false;

    const groups = getProductModifierGroups(selectedProduct.id);
    for (const group of groups) {
      if (group.is_required) {
        const selected = selectedModifiers[group.id] || [];
        if (selected.length === 0) {
          return false;
        }
      }
    }
    return true;
  };

  const addToCart = () => {
    if (!canAddToCart()) {
      alert('Mohon pilih modifier yang wajib dipilih');
      return;
    }

    const modifiers = [];
    Object.entries(selectedModifiers).forEach(([groupId, modifierIds]) => {
      modifierIds.forEach(modId => {
        const modifier = menu.modifiers.find(m => m.id === modId);
        if (modifier) {
          modifiers.push({
            id: modifier.id,
            name: modifier.name,
            price_delta: modifier.price_delta,
            group_id: groupId
          });
        }
      });
    });

    const item = {
      id: Date.now().toString(),
      product_id: selectedProduct.id,
      product_name: selectedProduct.name,
      price: selectedProduct.price,
      quantity: quantity,
      modifiers: modifiers,
      subtotal: calculateItemSubtotal()
    };

    setCart([...cart, item]);
    setSelectedProduct(null);
    setSelectedModifiers({});
    setQuantity(1);
  };

  const removeFromCart = (itemId) => {
    setCart(cart.filter(item => item.id !== itemId));
  };

  const updateCartItemQty = (itemId, newQty) => {
    const qty = Number(newQty);
    if (!Number.isFinite(qty) || qty < 1) return;
    setCart(prevCart =>
      prevCart.map(item => {
        if (item.id !== itemId) return item;
        const mods = Array.isArray(item.modifiers) ? item.modifiers : [];
        const modifiersTotal = mods.reduce(
          (sum, m) => sum + Number(m?.price_delta || 0),
          0
        );
        const price = Number(item.price || 0);
        return {
          ...item,
          quantity: qty,
          modifiers: mods,
          subtotal: (price + modifiersTotal) * qty,
        };
      })
    );
  };

  const handleOpenCheckout = () => {
    if (isStoreClosed) {
      alert('Maaf, toko sedang tutup. Silakan coba lagi nanti.');
      return;
    }
    setShowCart(false);
    setShowCheckout(true);
  };

  const handleCheckoutSuccess = (orderData) => {
    setCart([]);
    localStorage.removeItem('cart');
    setShowCheckout(false);
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
    // .filter(p => p.is_active)
    .filter(p => {
      // Special filter for Hot Deals
      if (selectedCategory === 'hot-deals') {
        return p.is_hot_deal && p.name.toLowerCase().includes(searchQuery.toLowerCase());
      }
      const matchesCategory = selectedCategory === 'all' || p.category_id === selectedCategory;
      const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });

  // Get active categories
  const activeCategories = menu.categories.filter(c =>
    menu.products.some(p => p.category_id === c.id)
  );

  const handleBackToMenu = () => {
    setShowCheckout(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-primary-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-primary-600 mx-auto mb-4"></div>
          <p className="text-primary-900 font-medium">Memuat menu...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex flex-col">
      {/* Header */}
      <header className="bg-white shadow-md sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6">
          <div className="flex flex-col space-y-3 sm:space-y-0 sm:flex-row sm:justify-between sm:items-center">
            {/* Logo & Title */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-white rounded-md flex items-center justify-center">
                  <img
                    src="/logo192.png"
                    alt="Kedai Yuru Logo"
                    className="w-full h-full object-contain"
                  />
                </div>
                <div>
                  <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Kedai Yuru</h1>
                  <p className="text-xs text-gray-500 hidden sm:block">Mau Maem ? Kedai Yuru Solusinya</p>
                </div>
              </div>

              {/* Mobile Cart Button */}
              <button
                onClick={() => setShowCart(true)}
                className="sm:hidden btn-primary flex items-center relative px-4 py-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                {cart.length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold">
                    {cart.length}
                  </span>
                )}
              </button>
            </div>

            {/* Actions */}
            <div className="flex items-center space-x-2 sm:space-x-3">
              <a
                href="/track"
                className="flex-1 sm:flex-none text-center sm:text-left px-4 py-2 text-sm text-primary-600 hover:text-primary-700 font-medium bg-primary-50 hover:bg-primary-100 rounded-lg transition-colors flex items-center justify-center"
              >
                <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                Lacak Pesanan
              </a>

              {/* Desktop Cart Button */}
              <button
                onClick={() => setShowCart(true)}
                className="hidden sm:flex btn-primary items-center relative px-4 py-2"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <span>Cart ({cart.length})</span>
                {cart.length > 0 && (
                  <span className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold shadow-lg">
                    {cart.length}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Search Bar */}
          <div className="mt-3">
            <div className="relative">
              <input
                type="text"
                placeholder="Cari menu..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
              <svg className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Category Tabs */}
        <div className="border-t border-gray-200 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 overflow-x-auto">
            <div className="flex space-x-2 py-3 min-w-max">
              <button
                onClick={() => setSelectedCategory('all')}
                className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${selectedCategory === 'all'
                  ? 'bg-primary-600 text-white shadow-md'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
              >
                🍽️ Semua Menu
              </button>
              {/* Hot Deals Tab - only show if there are hot deals */}
              {hotDealsProducts.length > 0 && (
                <button
                  onClick={() => setSelectedCategory('hot-deals')}
                  className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all flex items-center gap-1 ${selectedCategory === 'hot-deals'
                    ? 'bg-red-600 text-white shadow-md'
                    : 'bg-red-100 text-red-700 hover:bg-red-200'
                    }`}
                >
                  🔥 Hot Deals
                  <span className={`text-xs px-1.5 py-0.5 rounded-full ${selectedCategory === 'hot-deals' ? 'bg-white text-red-600' : 'bg-red-600 text-white'
                    }`}>
                    {hotDealsProducts.length}
                  </span>
                </button>
              )}
              {activeCategories.map(category => (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategory(category.id)}
                  className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${selectedCategory === category.id
                    ? 'bg-primary-600 text-white shadow-md'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                >
                  {category.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      </header>
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

      {/* Products Grid */}
      <main className="max-w-7xl mx-auto px-4 py-6 sm:px-6 pb-24 sm:pb-32">
        {filteredProducts.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">🔍</div>
            <p className="text-gray-500 text-lg">Tidak ada menu ditemukan</p>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="mt-4 text-primary-600 hover:text-primary-700 font-medium"
              >
                Hapus pencarian
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-2 sm:gap-3 lg:gap-4">
            {filteredProducts.map((product) => {
              const productAvailable = isProductAvailable(product);
              const isDisabled = isStoreClosed || !productAvailable;
              return (
                <div
                  key={product.id}
                  onClick={() => !isDisabled && handleSelectProduct(product)}
                  className={`group bg-white rounded-2xl overflow-hidden shadow-md transition-all duration-300 border-2 flex flex-col ${isDisabled
                      ? 'cursor-not-allowed opacity-60 border-gray-300'
                      : 'cursor-pointer border-gray-200 hover:border-primary-400 hover:shadow-2xl'
                    }`}
                >
                  {/* Product Image (responsive with proper aspect ratio) */}
                  <div className="relative overflow-hidden bg-gray-100 w-full aspect-[4/3] sm:aspect-[4/3] md:aspect-[3/2] flex-shrink-0">
                    {product.image_url ? (
                      <>
                        <img
                          src={product.image_url}
                          alt={product.name}
                          className={`w-full h-full object-cover object-center transition-transform duration-500 ${productAvailable
                              ? 'transform group-hover:scale-110'
                              : 'grayscale'
                            }`}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                      </>
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                        <svg className="w-12 h-12 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                    )}

                    {/* Badge hot deal di atas image biar layout teks tidak berubah */}
                    {product.is_hot_deal && (
                      <div className="absolute top-2 left-2">
                        <span className="inline-flex items-center gap-1 bg-red-600 text-white text-xs font-bold px-2 py-1 rounded-full shadow">
                          🔥 {product.discount_percent}% OFF
                        </span>
                      </div>
                    )}
                    {!productAvailable && (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center backdrop-blur-sm">
                        <span className="bg-gray-800 text-white text-sm font-bold px-4 py-2 rounded-full shadow-lg">
                          ⚠️ Tidak Tersedia
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Product Info (responsive layout) */}
                  <div className="p-2 sm:p-3 lg:p-4 flex flex-col flex-1">
                    {/* Product name with responsive text sizing */}
                    <h3 className="font-bold text-xs sm:text-sm lg:text-base text-gray-900 line-clamp-2 leading-snug min-h-[28px] sm:min-h-[32px] lg:min-h-[44px] mb-2">
                      {product.name}
                    </h3>

                    {/* Price & sold info with responsive layout */}
                    <div className="mt-1 flex items-center justify-between min-h-[32px] sm:min-h-[36px] lg:min-h-[40px] mb-2 sm:mb-3">
                      <div className="flex flex-col">
                        <p
                          className={`text-xs sm:text-sm lg:text-lg font-bold ${product.is_hot_deal ? 'text-red-600' : 'text-primary-600'}
                            }`}
                        >
                          {formatRupiah(product.price)}
                        </p>

                        {product.is_hot_deal && product.original_price > 0 && (
                          <p className="text-xs text-gray-400 line-through">
                            {formatRupiah(product.original_price)}
                          </p>
                        )}
                      </div>

                      {(product.total_sold || 0) > 0 ? (
                        <div className="flex items-center gap-1 bg-orange-50 text-orange-600 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full">
                          <svg className="w-2.5 h-2.5 sm:w-3.5 sm:h-3.5" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                          </svg>
                          <span className="text-xs font-semibold">{product.total_sold} terjual</span>
                        </div>
                      ) : (
                        <div className="h-[20px] sm:h-[24px]" />
                      )}
                    </div>

                    {/* Responsive order button */}
                    <button
                      disabled={isStoreClosed}
                      className={`mt-auto ${isStoreClosed
                        ? 'bg-gray-400 cursor-not-allowed'
                        : product.is_hot_deal
                          ? 'bg-red-600 hover:bg-red-700'
                          : 'bg-primary-600 hover:bg-primary-700'
                        } text-white rounded-lg sm:rounded-xl px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm font-semibold shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-1 sm:gap-2 w-full`}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!isDisabled) handleSelectProduct(product);
                      }}
                    >
                      {isDisabled ? (
                        <>
                          <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                          </svg>
                          <span className="text-xs sm:text-sm">Tidak Tersedia</span>
                        </>
                      ) : (
                        <>
                          <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                          </svg>
                          <span className="text-xs sm:text-sm">Pesan</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Floating Cart Summary (Mobile) */}
      {cart.length > 0 && !showCart && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t-2 border-primary-600 shadow-2xl sm:hidden z-30">
          <div className="px-4 py-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">{cart.length} item di cart</span>
              <span className="text-lg font-bold text-gray-900">
                {formatRupiah(cart.reduce((sum, item) => sum + item.subtotal, 0))}
              </span>
            </div>
            <button
              onClick={() => setShowCart(true)}
              className="btn-primary px-6 py-3 text-lg font-bold shadow-lg"
            >
              Lihat Cart
            </button>
          </div>
        </div>
      )}

      {/* Product Modal */}
      {selectedProduct && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end sm:items-center justify-center p-0 sm:p-4 z-50">
          <div className="bg-white rounded-t-3xl sm:rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto relative">
            {/* Close Button - Always visible */}
            <button
              onClick={() => setSelectedProduct(null)}
              className="absolute top-4 right-4 w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-lg hover:bg-gray-100 transition-colors z-10"
            >
              <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Product Image */}
            {selectedProduct.image_url && (
              <div className="relative h-56 sm:h-72 overflow-hidden rounded-t-3xl sm:rounded-t-2xl">
                <img
                  src={selectedProduct.image_url}
                  alt={selectedProduct.name}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
              </div>
            )}

            <div className="p-6">
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">{selectedProduct.name}</h2>

              {/* Hot Deal Badge in Modal */}
              {selectedProduct.is_hot_deal && (
                <div className="flex items-center gap-2 mb-3">
                  <span className="inline-flex items-center gap-1 bg-red-600 text-white text-sm font-bold px-3 py-1 rounded-full animate-pulse">
                    🔥 HOT DEAL - {selectedProduct.discount_percent}% OFF
                  </span>
                  {selectedProduct.original_price > 0 && (
                    <span className="text-sm text-green-600 font-semibold">
                      Hemat {formatRupiah(selectedProduct.original_price - selectedProduct.price)}
                    </span>
                  )}
                </div>
              )}

              {/* Product Description */}
              {selectedProduct.description && (
                <p className="text-gray-600 text-sm sm:text-base leading-relaxed mb-4">
                  {selectedProduct.description}
                </p>
              )}

              {/* Price & Sold Count */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-baseline gap-3">
                  <p className={`text-3xl font-bold ${selectedProduct.is_hot_deal ? 'text-red-600' : 'text-primary-600'}`}>
                    {formatRupiah(selectedProduct.price)}
                  </p>
                  {/* Original Price (strikethrough) */}
                  {selectedProduct.is_hot_deal && selectedProduct.original_price > 0 && (
                    <p className="text-xl text-gray-400 line-through">
                      {formatRupiah(selectedProduct.original_price)}
                    </p>
                  )}
                </div>

                {/* Total Sold Badge */}
                {(selectedProduct.total_sold || 0) > 0 && (
                  <div className="flex items-center gap-1.5 bg-orange-100 text-orange-700 px-3 py-1.5 rounded-full">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                    <span className="text-sm font-bold">{selectedProduct.total_sold} terjual</span>
                  </div>
                )}
              </div>

              {/* Modifiers (tanpa icon) */}
              {getProductModifierGroups(selectedProduct.id).map((group) => {
                const isMultiple = group.selection_type === 'multiple';
                const selectedCount = (selectedModifiers[group.id] || []).length;

                return (
                  <div key={group.id} className="mb-6 pb-6 border-b last:border-b-0">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-lg text-gray-900">
                          {group.name}
                          {group.is_required && <span className="text-red-500 ml-2">*</span>}
                        </h3>
                      </div>

                      <div className="flex items-center gap-2">
                        {isMultiple && selectedCount > 0 && (
                          <span className="text-xs px-2 py-1 bg-primary-100 text-primary-700 rounded-full font-bold">
                            {selectedCount}/{group.max_select}
                          </span>
                        )}

                        <span
                          className={`text-xs sm:text-sm px-3 py-1 rounded-full font-medium ${isMultiple ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                            }`}
                        >
                          {group.selection_type === 'single' ? 'Pilih 1' : `Max ${group.max_select}`}
                        </span>
                      </div>
                    </div>

                    <div className={isMultiple ? 'space-y-3' : 'space-y-2'}>
                      {getGroupModifiers(group.id).map((modifier) => {
                        const isChecked = (selectedModifiers[group.id] || []).includes(modifier.id);

                        if (isMultiple) {
                          // Checkbox style (multiple)
                          return (
                            <label
                              key={modifier.id}
                              className={`flex items-center p-4 border-2 rounded-xl cursor-pointer transition-all ${isChecked
                                ? 'border-purple-500 bg-purple-50 shadow-md'
                                : 'border-gray-200 hover:border-purple-300 hover:bg-purple-50/50'
                                }`}
                            >
                              <div className="flex items-center flex-1">
                                {/* Custom Checkbox */}
                                <div
                                  className={`w-6 h-6 rounded-md border-2 flex items-center justify-center mr-3 transition-all ${isChecked ? 'bg-purple-500 border-purple-500' : 'border-gray-300 bg-white'
                                    }`}
                                >
                                  {isChecked && (
                                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                    </svg>
                                  )}
                                </div>

                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={(e) => handleModifierChange(group.id, modifier.id, e.target.checked)}
                                  className="hidden"
                                />

                                <div className="flex-1">
                                  <span className="font-medium text-gray-900">{modifier.name}</span>
                                  {modifier.price_delta > 0 && (
                                    <span className="block text-sm text-purple-600 font-semibold mt-0.5">
                                      +{formatRupiah(modifier.price_delta)}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </label>
                          );
                        }

                        // Radio style (single)
                        return (
                          <label
                            key={modifier.id}
                            className={`flex items-center p-4 border-2 rounded-xl cursor-pointer transition-all ${isChecked
                              ? 'border-primary-500 bg-primary-50 shadow-md'
                              : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                              }`}
                          >
                            <input
                              type="radio"
                              name={`modifier-group-${group.id}`}
                              checked={isChecked}
                              onChange={(e) => handleModifierChange(group.id, modifier.id, e.target.checked)}
                              className="w-5 h-5 text-primary-600 mr-3 cursor-pointer"
                            />

                            <span className="flex-1 font-medium text-gray-900">{modifier.name}</span>

                            {modifier.price_delta > 0 && (
                              <span className="text-primary-600 font-bold">+{formatRupiah(modifier.price_delta)}</span>
                            )}
                          </label>
                        );
                      })}
                    </div>

                    {/* Helper text for multiple selection */}
                    {isMultiple && (
                      <p className="text-xs text-gray-500 mt-2 ml-1">
                        Anda bisa pilih hingga {group.max_select} item
                      </p>
                    )}
                  </div>
                );
              })}

              {/* Quantity Selector */}
              <div className="mb-6">
                <h3 className="font-bold text-lg text-gray-900 mb-3">Jumlah</h3>
                <div className="flex items-center space-x-4">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="w-12 h-12 bg-gray-200 hover:bg-gray-300 rounded-full flex items-center justify-center text-gray-700 font-bold text-xl transition-colors"
                  >
                    −
                  </button>
                  <span className="text-2xl font-bold text-gray-900 min-w-[3rem] text-center">{quantity}</span>
                  <button
                    onClick={() => setQuantity(quantity + 1)}
                    className="w-12 h-12 bg-primary-600 hover:bg-primary-700 rounded-full flex items-center justify-center text-white font-bold text-xl transition-colors"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Add to Cart Button - Inside scrollable content at bottom */}
              <div className="pt-4 border-t">
                <button
                  onClick={addToCart}
                  disabled={!canAddToCart()}
                  className={`w-full py-4 text-lg font-bold shadow-xl flex items-center justify-between rounded-xl transition-all ${canAddToCart()
                    ? 'btn-primary hover:scale-[1.02]'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    }`}
                >
                  <span>Tambah ke Cart</span>
                  <span>{formatRupiah(calculateItemSubtotal())}</span>
                </button>
                {!canAddToCart() && (
                  <p className="text-xs text-red-500 text-center mt-2">
                    * Mohon pilih modifier yang wajib dipilih
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cart Modal */}
      {showCart && (
        <Cart
          cart={cart}
          onClose={() => setShowCart(false)}
          onRemoveItem={removeFromCart}
          onUpdateQty={updateCartItemQty}
          onCheckout={handleOpenCheckout}
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
              href={`https://wa.me/${process.env.REACT_APP_WHATSAPP_NUMBER}`}
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
    </div>
  );
};

export default CustomerMenu;