import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { publicAPI } from '../services/api';
import { useCustomerAuth } from '../contexts/CustomerAuthContext';
import Checkout from '../components/customer/Checkout';
import Cart from '../components/customer/Cart';
import CustomerGoogleLogin from '../components/customer/CustomerGoogleLogin';
import Toast from '../components/common/Toast';

const CustomerMenu = () => {
  // eslint-disable-next-line no-unused-vars
  const navigate = useNavigate();
  const { customer, logout, login, getToken } = useCustomerAuth();
  
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
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showOrderHistory, setShowOrderHistory] = useState(false); // NEW
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showMobileCustomerMenu, setShowMobileCustomerMenu] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isUpdatingPhone, setIsUpdatingPhone] = useState(false);
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

  // Set initial phone number when customer data changes
  useEffect(() => {
    if (customer && customer.phone) {
      setPhoneNumber(customer.phone);
    }
  }, [customer]);

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
      Toast.error('❌ Gagal memuat menu. Silakan refresh halaman.');
    } finally {
      setLoading(false);
    }
  };

  const updatePhoneNumber = async () => {
    if (!phoneNumber.trim()) {
      Toast.warning('Nomor telepon tidak boleh kosong');
      return;
    }

    // Validate phone number format
    const phoneRegex = /^(\+62|62|0)[0-9]{9,12}$/;
    if (!phoneRegex.test(phoneNumber.replace(/\s/g, ''))) {
      Toast.error('Format nomor telepon tidak valid. Contoh: 08123456789');
      return;
    }

    setIsUpdatingPhone(true);
    const loadingToast = Toast.loading('💾 Menyimpan perubahan nomor telepon...');
    
    try {
      const token = getToken();
      if (!token) {
        throw new Error('Token tidak ditemukan. Silakan login kembali.');
      }

      const response = await fetch(`${process.env.REACT_APP_API_URL}/public/customer/profile/phone`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          phone: phoneNumber.replace(/\s/g, '')
        })
      });

      // Check if response is JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const textResponse = await response.text();
        console.error('Non-JSON response:', textResponse);
        throw new Error('Server mengembalikan response yang tidak valid. Periksa koneksi atau hubungi admin.');
      }

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      if (!result.success) {
        throw new Error(result.error || 'Gagal mengupdate nomor telepon');
      }
      
      // Update customer data in context
      if (result.customer) {
        login(result.customer, token);
      }
      
      Toast.dismiss(loadingToast);
      Toast.success('✅ Nomor telepon berhasil diperbarui!');
      setShowProfileModal(false);
      
    } catch (error) {
      console.error('Error updating phone:', error);
      Toast.dismiss(loadingToast);
      
      if (error.message.includes('fetch')) {
        Toast.error('❌ Gagal terhubung ke server. Pastikan koneksi internet stabil.');
      } else {
        Toast.error(`❌ ${error.message}` || 'Gagal mengupdate nomor telepon');
      }
    } finally {
      setIsUpdatingPhone(false);
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
      category_id: selectedProduct.category_id,
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

    // Update local customer stats so header reflects new total orders immediately
    if (customer) {
      const updatedCustomer = {
        ...customer,
        total_orders: (customer.total_orders || 0) + 1,
      };

      const token = getToken && getToken();
      if (login && token) {
        login(updatedCustomer, token);
      }
    }
  };

  const formatRupiah = (number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(number);
  };

  const formatMemberSince = (dateString) => {
    if (!dateString) return new Date().getFullYear(); // Default ke tahun sekarang jika tidak ada data
    
    try {
      let date = new Date(dateString);
      
      // Jika parsing gagal, coba ekstrak tahun dari string
      if (isNaN(date.getTime())) {
        const yearMatch = dateString.toString().match(/(\d{4})/);
        if (yearMatch) {
          return parseInt(yearMatch[1]);
        }
        return new Date().getFullYear(); // Fallback ke tahun sekarang
      }
      
      return date.getFullYear();
    } catch (error) {
      return new Date().getFullYear(); // Fallback ke tahun sekarang
    }
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

              {/* Customer Auth & Mobile Cart */}
              <div className="flex items-center space-x-1 sm:hidden relative">
                {customer ? (
                  <div className="flex items-center space-x-1">
                    {/* Mobile Customer Avatar & Menu */}
                    <button
                      onClick={() => setShowMobileCustomerMenu(!showMobileCustomerMenu)}
                      className="flex items-center space-x-2 bg-primary-50 hover:bg-primary-100 rounded-lg px-2 py-1 transition-colors"
                      title="Menu Customer"
                    >
                      <img 
                        src={customer.avatar || '/default-avatar.png'} 
                        alt="Avatar"
                        className="w-7 h-7 rounded-full border border-gray-300"
                      />
                      <span className="text-xs font-medium text-primary-700 max-w-16 truncate">
                        {customer.name.split(' ')[0]}
                      </span>
                      <svg className={`w-3 h-3 text-primary-600 transition-transform ${showMobileCustomerMenu ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>

                    {/* Mobile Customer Dropdown */}
                    {showMobileCustomerMenu && (
                      <>
                        {/* Backdrop */}
                        <div 
                          className="fixed inset-0 z-40" 
                          onClick={() => setShowMobileCustomerMenu(false)}
                        />
                        
                        {/* Dropdown Menu */}
                        <div className="absolute top-full right-0 mt-1 bg-white rounded-xl shadow-xl border border-gray-200 z-50 w-48">
                          <div className="p-3 border-b border-gray-100">
                            <div className="flex items-center space-x-2">
                              <img 
                                src={customer.avatar || '/default-avatar.png'} 
                                alt="Avatar"
                                className="w-8 h-8 rounded-full border border-gray-300"
                              />
                              <div>
                                <p className="font-medium text-gray-900 text-sm">{customer.name}</p>
                                <p className="text-xs text-gray-500">Member Customer</p>
                              </div>
                            </div>
                          </div>

                          <div className="py-2">
                            <button
                              onClick={() => {
                                setShowMobileCustomerMenu(false);
                                setShowOrderHistory(true);
                              }}
                              className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center space-x-2"
                            >
                              <svg className="w-4 h-4 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                              </svg>
                              <span>Riwayat Pesanan</span>
                            </button>
                            
                            <button
                              onClick={() => {
                                setShowMobileCustomerMenu(false);
                                setShowProfileModal(true);
                              }}
                              className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center space-x-2"
                            >
                              <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                              <span>Edit Profile</span>
                            </button>
                            
                            <div className="border-t border-gray-100 mt-2 pt-2">
                              <button
                                onClick={() => {
                                  setShowMobileCustomerMenu(false);
                                  logout();
                                }}
                                className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center space-x-2"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                                </svg>
                                <span>Keluar</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                ) : (
                  <button
                    onClick={() => setShowLoginModal(true)}
                    className="text-xs bg-primary-600 text-white px-2 py-1 rounded-lg hover:bg-primary-700 transition-colors"
                  >
                    Masuk
                  </button>
                )}
                
                <button
                  onClick={() => setShowCart(true)}
                  className="sm:hidden bg-primary-600 hover:bg-primary-700 text-white rounded-lg flex items-center relative px-3 py-1 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  {cart.length > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-xs font-bold">
                      {cart.length}
                    </span>
                  )}
                </button>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center space-x-2 sm:space-x-3">
              {/* Customer Auth - Desktop & Tablet */}
              <div className="hidden sm:block">
                {customer ? (
                  <div className="flex items-center space-x-2 lg:space-x-3">
                    <div className="flex items-center space-x-2 bg-gray-50 rounded-lg px-2 py-1.5 lg:px-3 lg:py-2">
                      <img 
                        src={customer.avatar || '/default-avatar.png'} 
                        alt="Avatar"
                        className="w-7 h-7 lg:w-8 lg:h-8 rounded-full border border-gray-300"
                      />
                      <div className="text-xs lg:text-sm">
                        <p className="font-medium text-gray-700">{customer.name}</p>
                        <p className="text-xs text-gray-500 hidden lg:block">Member Customer</p>
                      </div>
                    </div>
                    
                    {/* Order History Button */}
                    <button
                      onClick={() => setShowOrderHistory(true)}
                      className="text-xs lg:text-sm text-primary-600 hover:text-primary-700 bg-primary-50 hover:bg-primary-100 rounded-lg px-2 py-1.5 lg:px-3 lg:py-2 flex items-center transition-colors"
                      title="Riwayat Pesanan"
                    >
                      <svg className="w-3.5 h-3.5 lg:w-4 lg:h-4 mr-1 lg:mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                      </svg>
                      <span className="hidden md:inline">Riwayat</span>
                    </button>

                    {/* Profile Edit Button */}
                    <button
                      onClick={() => setShowProfileModal(true)}
                      className="text-xs lg:text-sm text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg px-2 py-1.5 lg:px-3 lg:py-2 flex items-center transition-colors"
                      title="Edit Profile"
                    >
                      <svg className="w-3.5 h-3.5 lg:w-4 lg:h-4 mr-1 lg:mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      <span className="hidden md:inline">Edit</span>
                    </button>
                    
                    <button
                      onClick={logout}
                      className="text-gray-600 hover:text-gray-800 p-1 transition-colors"
                      title="Keluar"
                    >
                      <svg className="w-4 h-4 lg:w-5 lg:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowLoginModal(true)}
                    className="bg-primary-600 text-white px-3 py-1.5 lg:px-4 lg:py-2 text-sm lg:text-base rounded-lg hover:bg-primary-700 transition-colors"
                  >
                    <span className="hidden lg:inline">Masuk dengan Google</span>
                    <span className="lg:hidden">Masuk</span>
                  </button>
                )}
              </div>

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

          {/* Customer Welcome Message */}
          {customer && (
            <div className="mt-3 bg-gradient-to-r from-primary-500 to-primary-600 text-white p-3 rounded-lg">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-2">
                <p className="text-sm font-medium">
                  👋 Selamat datang, {customer.name.split(' ')[0]}!
                </p>
                <div className="text-xs opacity-90">
                  <span className="flex items-center">
                    <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    {customer.total_orders || 0} pesanan
                  </span>
                </div>
              </div>
            </div>
          )}

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
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-end md:items-center justify-center p-0 md:p-4 z-50 backdrop-blur-sm">
          <div className="bg-white rounded-t-2xl md:rounded-2xl max-w-2xl w-full max-h-[90vh] md:max-h-[85vh] overflow-hidden relative shadow-2xl transform transition-all duration-300">
            {/* Close Button - Enhanced */}
            <button
              onClick={() => setSelectedProduct(null)}
              className="absolute top-3 right-3 w-10 h-10 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-lg hover:bg-white hover:scale-110 transition-all duration-200 z-20"
            >
              <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Product Image */}
            {selectedProduct.image_url && (
              <div className="relative h-48 md:h-60 overflow-hidden rounded-t-2xl md:rounded-t-2xl">
                <img
                  src={selectedProduct.image_url}
                  alt={selectedProduct.name}
                  className="w-full h-full object-cover transform hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent"></div>
                {/* Floating product name on image */}
                <div className="absolute bottom-3 left-3 right-14 text-white">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 pr-2">
                      <h1 className="text-xl md:text-2xl font-bold drop-shadow-lg">{selectedProduct.name}</h1>
                      {selectedProduct.is_hot_deal && (
                        <div className="mt-2">
                          <span className="inline-flex items-center gap-1.5 bg-red-600/90 backdrop-blur-sm text-white text-xs font-bold px-3 py-1.5 rounded-full animate-pulse shadow-lg">
                            <span className="text-sm">🔥</span>
                            <span>HOT DEAL - {selectedProduct.discount_percent}% OFF</span>
                          </span>
                        </div>
                      )}
                    </div>
                    {/* Sold Count - Always visible on mobile if product has sales */}
                    {selectedProduct.total_sold > 0 && (
                      <div className="md:hidden bg-black/40 backdrop-blur-sm rounded-lg px-2.5 py-2 flex-shrink-0">
                        <div className="flex items-center space-x-1 text-white">
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                          </svg>
                          <span className="text-xs font-bold">{selectedProduct.total_sold}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Header for products without image */}
            {!selectedProduct.image_url && (
              <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4 rounded-t-2xl md:rounded-t-2xl">
                <div className="flex items-start justify-between">
                  <div className="flex-1 pr-2">
                    <h1 className="text-xl md:text-2xl font-bold">{selectedProduct.name}</h1>
                    {selectedProduct.is_hot_deal && (
                      <div className="mt-2">
                        <span className="inline-flex items-center gap-1.5 bg-red-600/90 backdrop-blur-sm text-white text-xs font-bold px-3 py-1.5 rounded-full animate-pulse shadow-lg">
                          <span className="text-sm">🔥</span>
                          <span>HOT DEAL - {selectedProduct.discount_percent}% OFF</span>
                        </span>
                      </div>
                    )}
                  </div>
                  {/* Sold Count - Always visible on mobile if product has sales */}
                  {selectedProduct.total_sold > 0 && (
                    <div className="md:hidden bg-white/25 backdrop-blur-sm rounded-lg px-2.5 py-2 flex-shrink-0">
                      <div className="flex items-center space-x-1 text-white">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                        <span className="text-xs font-bold">{selectedProduct.total_sold}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Scrollable Content Area */}
            <div className="overflow-y-auto flex-1" style={{maxHeight: 'calc(90vh - 240px)'}}>
              <div className="p-3 md:p-4 pb-32 md:pb-40">
                {/* Savings highlight for hot deals */}
                {selectedProduct.is_hot_deal && selectedProduct.original_price > 0 && (
                  <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-3 mb-4">
                    <div className="flex items-center justify-center space-x-2">
                      <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                        </svg>
                      </div>
                      <div className="text-center">
                        <p className="text-xs font-medium text-gray-700">Anda menghemat</p>
                        <p className="text-lg font-bold text-green-600">
                          {formatRupiah(selectedProduct.original_price - selectedProduct.price)}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Product Description */}
                {selectedProduct.description && (
                  <div className="mb-4">
                    <h3 className="text-base font-bold text-gray-900 mb-2 flex items-center space-x-2">
                      <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>Deskripsi Produk</span>
                    </h3>
                    <p className="text-gray-600 text-sm leading-relaxed bg-gray-50 rounded-lg p-3">
                      {selectedProduct.description}
                    </p>
                  </div>
                )}

                {/* Price & Stats Section */}
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-4 mb-4 border border-blue-100">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                    {/* Price Section */}
                    <div className="flex flex-col">
                      <p className="text-xs font-medium text-gray-600 mb-1">Harga</p>
                      <div className="flex items-baseline gap-2">
                        <p className={`text-2xl md:text-3xl font-bold ${selectedProduct.is_hot_deal ? 'text-red-600' : 'text-blue-600'}`}>
                          {formatRupiah(selectedProduct.price)}
                        </p>
                        {/* Original Price (strikethrough) */}
                        {selectedProduct.is_hot_deal && selectedProduct.original_price > 0 && (
                          <p className="text-base text-gray-400 line-through">
                            {formatRupiah(selectedProduct.original_price)}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Stats Section - Desktop only */}
                    <div className="hidden md:flex items-center gap-2">
                      {(selectedProduct.total_sold || 0) > 0 && (
                        <div className="flex items-center gap-2 bg-white/70 backdrop-blur-sm text-orange-700 px-3 py-2 rounded-lg shadow-sm">
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                          </svg>
                          <div>
                            <p className="text-xs text-gray-600">Terjual</p>
                            <p className="text-sm font-bold">{selectedProduct.total_sold}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
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
                <div className="mb-4">
                  <h3 className="font-bold text-base text-gray-900 mb-3 flex items-center space-x-2">
                    <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
                    </svg>
                    <span>Jumlah Pesanan</span>
                  </h3>
                  <div className="bg-gray-50 rounded-xl p-3">
                    <div className="flex items-center justify-center space-x-4">
                      <button
                        onClick={() => setQuantity(Math.max(1, quantity - 1))}
                        className="w-11 h-11 bg-white hover:bg-gray-100 border-2 border-gray-200 hover:border-gray-300 rounded-xl flex items-center justify-center text-gray-700 font-bold text-xl transition-all duration-200 shadow-sm hover:shadow-md"
                        disabled={quantity <= 1}
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M20 12H4" />
                        </svg>
                      </button>
                      
                      <div className="bg-white rounded-lg px-4 py-2 border-2 border-blue-200">
                        <span className="text-2xl font-bold text-blue-600 min-w-[3rem] text-center block">{quantity}</span>
                      </div>
                      
                      <button
                        onClick={() => setQuantity(quantity + 1)}
                        className="w-11 h-11 bg-blue-600 hover:bg-blue-700 border-2 border-blue-600 rounded-xl flex items-center justify-center text-white font-bold text-xl transition-all duration-200 shadow-sm hover:shadow-md"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>

              </div>
            </div>

            {/* Sticky Add to Cart Footer */}
            <div className="bg-white border-t border-gray-200 p-3 md:p-4 sticky bottom-0">
              <div className="space-y-2">
                {!canAddToCart() && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-2">
                    <p className="text-xs text-red-700 text-center font-medium flex items-center justify-center space-x-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.232 16.5c-.77.833.192 2.5 1.732 2.5z" />
                      </svg>
                      <span>Mohon Pilih Tanda Bintang Terlebih Dahulu</span>
                    </p>
                  </div>
                )}
                
                <button
                  onClick={addToCart}
                  disabled={!canAddToCart()}
                  className={`w-full py-4 px-4 text-lg font-bold shadow-lg rounded-xl transition-all duration-200 ${canAddToCart()
                    ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800 hover:scale-[1.02] active:scale-[0.98]'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center space-x-3">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-2.5 5.5M7 13v6a1 1 0 001 1h10a1 1 0 001-1v-6M17 13v6M9 13v6" />
                      </svg>
                      <span>Tambah ke Cart</span>
                    </div>
                    <div className="bg-white/20 backdrop-blur-sm px-3 py-1.5 rounded-lg">
                      <span className="font-bold text-base">
                        {formatRupiah(calculateItemSubtotal())}
                      </span>
                    </div>
                  </div>
                </button>
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

      {/* Login Modal */}
      {showLoginModal && (
        <CustomerGoogleLogin 
          onSuccess={(customerData) => {
            setShowLoginModal(false);
            // Customer data already handled by context
          }}
          onClose={() => setShowLoginModal(false)}
        />
      )}

      {/* Order History Modal */}
      {showOrderHistory && (
        <OrderHistoryModal 
          onClose={() => setShowOrderHistory(false)}
        />
      )}

      {/* Profile Edit Modal */}
      {showProfileModal && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-5 text-white">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-xl font-bold flex items-center space-x-2">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    <span>Edit Profile</span>
                  </h2>
                  <p className="text-blue-100 text-sm mt-1">Perbarui informasi akun Anda</p>
                </div>
                <button
                  onClick={() => setShowProfileModal(false)}
                  className="text-white hover:text-blue-200 p-1.5 hover:bg-blue-800 rounded-lg transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6">
              {/* Current Profile Info */}
              <div className="bg-gradient-to-r from-gray-50 to-blue-50 rounded-xl p-5 mb-6 border border-gray-200">
                <div className="flex items-center space-x-4">
                  <div className="relative">
                    <img 
                      src={customer?.avatar || '/default-avatar.png'} 
                      alt="Avatar"
                      className="w-14 h-14 rounded-full border-3 border-white shadow-md"
                    />
                    <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white"></div>
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-gray-900 text-lg">{customer?.name}</p>
                    <p className="text-sm text-gray-600 flex items-center mt-1">
                      <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 7.89a2 2 0 002.83 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      {customer?.email}
                    </p>
                    <div className="flex items-center space-x-4 mt-2">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {customer?.total_orders || 0} pesanan
                      </span>
                      <span className="text-xs text-gray-500">
                        Member sejak {formatMemberSince(customer?.created_at)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Phone Number Form */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3 flex items-center space-x-2">
                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                    <span>Nomor Telepon</span>
                  </label>
                  
                  <input
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-0 transition-colors text-gray-900 placeholder-gray-500"
                    placeholder="Masukkan nomor telepon"
                  />
                </div>
                
                {/* Format Guidelines */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-blue-900 mb-2">Format yang diterima:</h4>
                  <ul className="text-xs text-blue-700 space-y-1">
                    <li className="flex items-center">
                      <span className="w-2 h-2 bg-blue-400 rounded-full mr-2"></span>
                      08123456789 (format Indonesia)
                    </li>
                    <li className="flex items-center">
                      <span className="w-2 h-2 bg-blue-400 rounded-full mr-2"></span>
                      62812345789 (format internasional)
                    </li>
                    <li className="flex items-center">
                      <span className="w-2 h-2 bg-blue-400 rounded-full mr-2"></span>
                      +62812345789 (format lengkap)
                    </li>
                  </ul>
                </div>

                {/* Current Phone Display */}
                {customer?.phone && (
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-gray-700 mb-1">Nomor saat ini:</h4>
                    <p className="text-sm text-gray-900 font-mono">{customer.phone}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="bg-gray-50 border-t px-6 py-4 rounded-b-2xl">
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowProfileModal(false)}
                  className="flex-1 px-4 py-3 border-2 border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-100 hover:border-gray-400 transition-colors"
                >
                  Batal
                </button>
                <button
                  onClick={updatePhoneNumber}
                  disabled={isUpdatingPhone || !phoneNumber.trim()}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-blue-800 transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                >
                  {isUpdatingPhone ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Menyimpan...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span>Simpan Perubahan</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
  
  // Hanya izinkan pelacakan untuk pesanan yang masih berjalan
  const isTrackableStatus = (status) => {
    const nonTrackable = [
      'completed',
      'delivered',
      'picked_up',
      'cancelled',
      'rejected'
    ];
    return !nonTrackable.includes(status);
  };

// Order History Modal Component
const OrderHistoryModal = ({ onClose }) => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    page: 1,
    totalPages: 1,
    total: 0,
    hasMore: false
  });

  useEffect(() => {
    fetchOrderHistory();
  }, []);

  const fetchOrderHistory = async (page = 1) => {
    try {
      setLoading(true);
      const response = await publicAPI.getCustomerOrders(page, 5);

      // Backend response shape: { success, data: { orders, pagination } }
      const apiData = response?.data?.data || {};
      const ordersFromApi = apiData.orders || [];
      const paginationFromApi = apiData.pagination || {};

      if (page === 1) {
        setOrders(ordersFromApi);
      } else {
        setOrders(prev => [...prev, ...ordersFromApi]);
      }

      setPagination(prev => ({
        ...prev,
        ...paginationFromApi,
      }));
    } catch (error) {
      console.error('Error fetching order history:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMoreOrders = () => {
    if (pagination.hasMore && !loading) {
      fetchOrderHistory(pagination.page + 1);
    }
  };

  const formatRupiah = (number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(number);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
      case 'delivered':
      case 'picked_up':
        return 'bg-green-100 text-green-800';
      case 'preparing':
      case 'ready':
        return 'bg-blue-100 text-blue-800';
      case 'pending':
      case 'confirmed':
        return 'bg-yellow-100 text-yellow-800';
      case 'cancelled':
      case 'rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status, type) => {
    const statusMap = {
      pending: 'Menunggu Konfirmasi',
      confirmed: 'Dikonfirmasi',
      preparing: 'Sedang Dimasak',
      ready: 'Siap',
      delivering: 'Dalam Pengiriman',
      delivered: 'Terkirim',
      picked_up: 'Sudah Diambil',
      completed: 'Selesai',
      cancelled: 'Dibatalkan',
      rejected: 'Ditolak'
    };
    return statusMap[status] || status;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-end md:items-center justify-center z-50 p-0 md:p-4 backdrop-blur-sm">
      <div className="bg-white rounded-t-2xl md:rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] md:max-h-[85vh] overflow-hidden transform transition-all duration-300">
        {/* Enhanced Header */}
        <div className="bg-gradient-to-r from-purple-600 to-purple-700 text-white p-4 md:p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 md:w-10 md:h-10 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                </svg>
              </div>
              <div>
                <h2 className="text-lg md:text-xl font-bold">Riwayat Pesanan</h2>
                <p className="text-purple-100 text-xs md:text-sm mt-0.5">Total: {pagination.total} pesanan</p>
              </div>
            </div>
            <button 
              onClick={onClose} 
              className="text-white hover:text-purple-200 p-1.5 hover:bg-purple-800/50 rounded-lg transition-all duration-200"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Enhanced Content */}
        <div className="p-3 md:p-4 overflow-y-auto bg-gray-50" style={{maxHeight: 'calc(90vh - 120px)'}}>
          {loading && orders.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <div className="animate-spin rounded-full h-6 w-6 border-3 border-purple-600 border-t-transparent"></div>
              </div>
              <p className="text-gray-600 font-medium text-sm">Memuat riwayat pesanan...</p>
              <p className="text-gray-400 text-xs mt-1">Mohon tunggu sebentar</p>
            </div>
          ) : orders.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                </svg>
              </div>
              <h3 className="text-base font-semibold text-gray-700 mb-2">Belum ada riwayat pesanan</h3>
              <p className="text-gray-500 mb-4 text-sm">Pesanan Anda akan muncul di sini setelah berbelanja</p>
              <button 
                onClick={onClose}
                className="bg-purple-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-purple-700 transition-colors text-sm"
              >
                Mulai Belanja
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {orders.map((order) => (
                <div key={order.id} className="bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-all duration-200 overflow-hidden">
                  {/* Order Header */}
                  <div className="bg-gradient-to-r from-gray-50 to-white p-3 border-b border-gray-100">
                    <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-2">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <p className="font-bold text-base text-gray-900">{order.order_no}</p>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                            {getStatusText(order.status, order.type)}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 flex items-center space-x-1">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span>{formatDate(order.created_at)}</span>
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-gray-600 mb-0.5">Total Pembayaran</p>
                        <p className="text-lg font-bold text-purple-600">
                          {formatRupiah(order.grand_total)}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Order Content */}
                  <div className="p-3">

                    {/* Order Items */}
                    <div className="space-y-3 mb-4">
                      {order.items?.slice(0, 3).map((item, idx) => (
                        <div key={idx} className="bg-gray-50 rounded-xl p-3">
                          <div className="flex justify-between items-start gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center space-x-2 mb-1">
                                <span className="bg-purple-100 text-purple-700 text-xs font-bold px-2 py-0.5 rounded-full">
                                  {item.qty}x
                                </span>
                                <span className="font-medium text-gray-900 text-sm">
                                  {item.product_name_snapshot}
                                </span>
                              </div>
                              {item.modifiers?.length > 0 && (
                                <p className="text-xs text-gray-500 ml-8">
                                  + {item.modifiers.map(m => m.modifier_name_snapshot).join(', ')}
                                </p>
                              )}
                            </div>
                            <span className="text-sm font-bold text-gray-900 whitespace-nowrap">
                              {formatRupiah(item.subtotal)}
                            </span>
                          </div>
                        </div>
                      ))}
                      {order.items?.length > 3 && (
                        <div className="text-center">
                          <span className="text-xs text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                            +{order.items.length - 3} item lainnya
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Order Footer */}
                    <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-3 pt-4 border-t border-gray-100">
                      <div className="flex items-center space-x-4 text-sm text-gray-600">
                        <div className="flex items-center space-x-2">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${order.type === 'delivery' ? 'bg-blue-100 text-blue-600' : 'bg-green-100 text-green-600'}`}>
                            {order.type === 'delivery' ? (
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                              </svg>
                            ) : (
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                              </svg>
                            )}
                          </div>
                          <span className="font-medium">
                            {order.type === 'delivery' ? 'Delivery' : 'Pickup'}
                          </span>
                        </div>
                        <div className="w-px h-4 bg-gray-300"></div>
                        <span className="font-medium uppercase text-xs bg-gray-100 px-2 py-1 rounded-md">
                          {order.payment_method}
                        </span>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        {order.public_tracking_token && isTrackableStatus(order.status) && (
                          <a
                            href={`/track?order=${order.order_no}&token=${order.public_tracking_token}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="bg-purple-100 text-purple-700 px-4 py-2 rounded-xl hover:bg-purple-200 transition-all duration-200 font-medium text-sm flex items-center space-x-2"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            <span>Lacak Pesanan</span>
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {/* Enhanced Load More Button */}
              {pagination.hasMore && (
                <div className="text-center pt-6">
                  <button
                    onClick={loadMoreOrders}
                    disabled={loading}
                    className="bg-white border-2 border-purple-200 hover:border-purple-300 hover:bg-purple-50 text-purple-700 px-8 py-4 rounded-2xl transition-all duration-200 disabled:opacity-50 font-medium shadow-sm hover:shadow-md"
                  >
                    {loading ? (
                      <span className="flex items-center justify-center space-x-3">
                        <div className="w-5 h-5 border-2 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
                        <span>Memuat pesanan...</span>
                      </span>
                    ) : (
                      <span className="flex items-center justify-center space-x-3">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                        <span>Muat Lebih ({pagination.total - orders.length} tersisa)</span>
                      </span>
                    )}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CustomerMenu;