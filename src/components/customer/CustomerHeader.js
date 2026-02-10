import React, { useState, useEffect } from 'react';
import { useCustomerAuth } from '../../contexts/CustomerAuthContext';
import CustomerGoogleLogin from './CustomerGoogleLogin';
import CustomerProfileModal from './CustomerProfileModal';
import OrderHistoryModal from './OrderHistoryModal';
import CustomerPointsModal from './CustomerPointsModal';

const CustomerHeader = ({ 
  cart, 
  onShowCart, 
  searchQuery = '', 
  onSearchChange = () => {}, 
  categories = [], 
  hotDealsProducts = [], 
  selectedCategory = 'all', 
  onCategoryChange = () => {} 
}) => {
  const { customer, logout, refreshCustomer } = useCustomerAuth();
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showOrderHistory, setShowOrderHistory] = useState(false);
  const [showPointsModal, setShowPointsModal] = useState(false);
  const [showMobileCustomerMenu, setShowMobileCustomerMenu] = useState(false);

  // Refresh customer data on mount to ensure points are up to date
  useEffect(() => {
    if (customer && refreshCustomer) {
      refreshCustomer(true); // silent refresh
    }
  }, [customer?.id]); // Re-run when customer ID changes (login/logout)

  const handleLoginSuccess = (customerData) => {
    setShowLoginModal(false);
  };

  const handleLogout = () => {
    logout();
  };

  const handleOpenPointsModal = async () => {
    // Refresh customer data before showing points modal to get latest points
    if (refreshCustomer) {
      await refreshCustomer(true); // silent refresh
    }
    setShowPointsModal(true);
  };

  const handleClosePointsModal = async () => {
    setShowPointsModal(false);
    // Refresh customer data after closing to update header
    if (refreshCustomer) {
      await refreshCustomer(true); // silent refresh
    }
  };

  return (
    <>
      <header className="bg-white shadow-md sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6">
          <div className="flex flex-col space-y-3 sm:space-y-0 sm:flex-row sm:justify-between sm:items-center">
            {/* Logo and Title */}
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

              {/* Mobile Customer Menu */}
              <div className="flex items-center space-x-1 sm:hidden relative">
                {customer ? (
                  <div className="flex items-center space-x-1">
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
                        {(customer.full_name || customer.name || 'User').split(' ')[0]}
                      </span>
                      <svg className={`w-3 h-3 text-primary-600 transition-transform ${showMobileCustomerMenu ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>

                    {/* Mobile Customer Dropdown */}
                    {showMobileCustomerMenu && (
                      <>
                        <div 
                          className="fixed inset-0 z-40" 
                          onClick={() => setShowMobileCustomerMenu(false)}
                        />
                        
                        <div className="absolute top-full right-0 mt-1 bg-white rounded-xl shadow-xl border border-gray-200 z-50 w-48">
                          <div className="p-3 border-b border-gray-100">
                            <div className="flex items-center space-x-2">
                              <img 
                                src={customer.avatar || '/default-avatar.png'} 
                                alt="Avatar"
                                className="w-8 h-8 rounded-full border border-gray-300"
                              />
                              <div>
                                <p className="font-medium text-gray-900 text-sm">{customer.full_name || customer.name}</p>
                                <p className="text-xs text-gray-500">Member Customer</p>
                              </div>
                            </div>
                          </div>

                          <div className="py-2">
                            <button
                              onClick={() => {
                                setShowOrderHistory(true);
                                setShowMobileCustomerMenu(false);
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
                                handleOpenPointsModal();
                                setShowMobileCustomerMenu(false);
                              }}
                              className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center space-x-2"
                            >
                              <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                              </svg>
                              <span>Poin Saya ({customer.current_points || 0})</span>
                            </button>
                            
                            <button
                              onClick={() => {
                                setShowProfileModal(true);
                                setShowMobileCustomerMenu(false);
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
                                  handleLogout();
                                  setShowMobileCustomerMenu(false);
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
                  onClick={onShowCart}
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

            {/* Desktop Customer Menu */}
            <div className="flex items-center space-x-2 sm:space-x-3">
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
                        <p className="font-medium text-gray-700">{customer.full_name || customer.name}</p>
                        <p className="text-xs text-gray-500 hidden lg:block">Member Customer</p>
                      </div>
                    </div>
                    
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

                    <button
                      onClick={handleOpenPointsModal}
                      className="text-xs lg:text-sm text-purple-600 hover:text-purple-700 bg-purple-50 hover:bg-purple-100 rounded-lg px-2 py-1.5 lg:px-3 lg:py-2 flex items-center transition-colors"
                      title="Poin Saya"
                    >
                      <svg className="w-3.5 h-3.5 lg:w-4 lg:h-4 mr-1 lg:mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                      </svg>
                      <span className="hidden md:inline">{customer.current_points || 0} Poin</span>
                      <span className="md:hidden">🎯</span>
                    </button>

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
                      onClick={handleLogout}
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
                onClick={onShowCart}
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
                  👋 Selamat datang, {(customer.full_name || customer.name || 'User').split(' ')[0]}!
                </p>
              </div>
            </div>
          )}

          {/* Search Bar */}
          <div className="mt-4 bg-white border border-gray-200 rounded-lg p-3">
            <div className="relative">
              <input
                type="text"
                placeholder="Cari menu..."
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
              <svg className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>

            {/* Category Filter */}
            <div className="mt-3 overflow-x-auto pb-2">
              <div className="flex space-x-2 min-w-max">
                <button
                  onClick={() => onCategoryChange('all')}
                  className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                    selectedCategory === 'all'
                      ? 'bg-primary-600 text-white shadow-md'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  🍽️ Semua Makanan
                </button>
                
                {/* Hot Deals Tab */}
                {hotDealsProducts.length > 0 && (
                  <button
                    onClick={() => onCategoryChange('hot-deals')}
                    className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all flex items-center gap-1 ${
                      selectedCategory === 'hot-deals'
                        ? 'bg-red-600 text-white shadow-md'
                        : 'bg-red-100 text-red-700 hover:bg-red-200'
                    }`}
                  >
                    🔥 Hot Deals
                    <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                      selectedCategory === 'hot-deals' ? 'bg-white text-red-600' : 'bg-red-600 text-white'
                    }`}>
                      {hotDealsProducts.length}
                    </span>
                  </button>
                )}

                {/* Categories */}
                {categories.map(category => (
                  <button
                    key={category.id}
                    onClick={() => onCategoryChange(category.id)}
                    className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                      selectedCategory === category.id
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
        </div>
      </header>

      {/* Modals */}
      {showLoginModal && (
        <CustomerGoogleLogin 
          onSuccess={handleLoginSuccess}
          onClose={() => setShowLoginModal(false)}
        />
      )}

      {showOrderHistory && (
        <OrderHistoryModal 
          onClose={() => setShowOrderHistory(false)}
        />
      )}

      {showPointsModal && (
        <CustomerPointsModal 
          onClose={handleClosePointsModal}
        />
      )}

      {showProfileModal && (
        <CustomerProfileModal 
          isOpen={showProfileModal}
          onClose={() => setShowProfileModal(false)}
        />
      )}
    </>
  );
};

export default CustomerHeader;