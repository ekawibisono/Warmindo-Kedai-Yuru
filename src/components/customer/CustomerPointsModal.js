import React, { useState, useEffect, useCallback } from 'react';
import { publicAPI } from '../../services/api';
import { useCustomerAuth } from '../../contexts/CustomerAuthContext';
import { notify } from '../common/Toast';

const CustomerPointsModal = ({ onClose }) => {
  const [loading, setLoading] = useState(true);
  const [pointsSummary, setPointsSummary] = useState(null);
  const [pointsHistory, setPointsHistory] = useState([]);
  const [activeTab, setActiveTab] = useState('summary');
  const [pagination, setPagination] = useState({
    page: 1,
    totalPages: 1,
    total: 0,
    hasMore: false
  });
  const { customer } = useCustomerAuth();

  // Voucher Rewards states
  const [voucherRewards, setVoucherRewards] = useState([]);
  const [loadingVouchers, setLoadingVouchers] = useState(false);
  const [redeeming, setRedeeming] = useState(null);
  const [myVouchers, setMyVouchers] = useState({ active: [], used: [], expired: [] });
  const [loadingMyVouchers, setLoadingMyVouchers] = useState(false);
  const [copiedCode, setCopiedCode] = useState(null);

  const fetchPointsSummary = useCallback(async () => {
    try {
      if (!customer) return;
      
      const response = await publicAPI.getCustomerPointsSummary();
      setPointsSummary(response.data.data);
    } catch (error) {
      console.error('Error fetching points summary:', error);
    }
  }, [customer]);

  const fetchPointsHistory = useCallback(async (page = 1) => {
    try {
      if (!customer) return;
      
      const response = await publicAPI.getCustomerPointsHistory(page, 10);
      const data = response.data.data;
      
      setPointsHistory(data.points_history || []);
      setPagination(data.pagination);
    } catch (error) {
      console.error('Error fetching points history:', error);
      setPointsHistory([]);
    }
  }, [customer]);

  // Fetch voucher rewards (for "Tukar Voucher" tab)
  const fetchVoucherRewards = useCallback(async () => {
    try {
      if (!customer) return;
      setLoadingVouchers(true);
      
      const response = await publicAPI.getCustomerVoucherRewards();
      const data = response.data.data;
      
      setVoucherRewards(data.rewards || []);
      setPointsSummary(prev => ({ ...prev, current_points: data.customer_points }));
    } catch (error) {
      console.error('Error fetching voucher rewards:', error);
      setVoucherRewards([]);
    } finally {
      setLoadingVouchers(false);
    }
  }, [customer]);

  // Fetch my vouchers (for "Voucher Saya" tab)
  const fetchMyVouchers = useCallback(async () => {
    try {
      if (!customer) return;
      setLoadingMyVouchers(true);
      
      const response = await publicAPI.getMyVouchers();
      const data = response.data.data;
      
      setMyVouchers(data.grouped || { active: [], used: [], expired: [] });
    } catch (error) {
      console.error('Error fetching my vouchers:', error);
      setMyVouchers({ active: [], used: [], expired: [] });
    } finally {
      setLoadingMyVouchers(false);
    }
  }, [customer]);

  useEffect(() => {
    if (!customer) return;
    
    setLoading(true);
    
    // Lazy load only active tab
    const loadTab = async () => {
      try {
        if (activeTab === 'summary') {
          await fetchPointsSummary();
        } else if (activeTab === 'history') {
          await fetchPointsHistory();
        } else if (activeTab === 'exchange') {
          await fetchVoucherRewards();
        } else if (activeTab === 'myvouchers') {
          await fetchMyVouchers();
        }
      } finally {
        setLoading(false);
      }
    };
    
    loadTab();
  }, [customer, activeTab, fetchPointsSummary, fetchPointsHistory, fetchVoucherRewards, fetchMyVouchers]);

  const handlePageChange = (newPage) => {
    fetchPointsHistory(newPage);
  };

  // Redeem voucher
  const handleRedeemVoucher = async (rewardId) => {
    if (!customer) {
      notify.error('Silakan login terlebih dahulu');
      return;
    }
    
    setRedeeming(rewardId);
    try {
      const response = await publicAPI.redeemVoucher(rewardId);
      const data = response.data.data;
      
      notify.success(`🎉 Voucher berhasil ditukar! Kode: ${data.voucher_code}`);
      
      // Refresh data
      await fetchVoucherRewards();
      await fetchPointsSummary();
    } catch (error) {
      const message = error.response?.data?.message || 'Gagal menukar voucher';
      notify.error(message);
    } finally {
      setRedeeming(null);
    }
  };

  const formatRupiah = (amount) => {
    const num = parseFloat(amount) || 0;
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(num);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('id-ID', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const copyVoucherCode = async (code) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(code);
      notify.success('Kode voucher berhasil disalin!');
      setTimeout(() => setCopiedCode(null), 2000);
    } catch (error) {
      notify.error('Gagal menyalin kode voucher');
    }
  };

  const getPointsTypeLabel = (type) => {
    const typeMap = {
      'order': 'Pembelian',
      'bonus': 'Bonus',
      'redemption': 'Penukaran',
      'manual': 'Manual'
    };
    return typeMap[type] || type;
  };

  if (!customer) {
    return (
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex justify-center items-end sm:items-center z-50 p-0 sm:p-4 animate-fadeIn"
        onClick={onClose}
      >
        <div 
          className="bg-white rounded-t-3xl sm:rounded-2xl p-6 sm:p-8 w-full sm:w-11/12 max-w-md shadow-2xl animate-slideUp"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex justify-center mb-4">
            <div className="w-12 h-1 bg-gray-300 rounded-full sm:hidden"></div>
          </div>
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold mb-2 text-gray-800">Sistem Poin</h2>
            <p className="text-gray-600">Silakan login terlebih dahulu untuk melihat poin Anda.</p>
          </div>
          <button
            onClick={onClose}
            className="w-full bg-gradient-to-r from-gray-500 to-gray-600 text-white py-3 px-4 rounded-xl font-medium hover:from-gray-600 hover:to-gray-700 transition-all duration-300 shadow-lg hover:shadow-xl active:scale-95"
          >
            Tutup
          </button>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-end sm:items-center z-50 p-0 sm:p-4"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-t-3xl sm:rounded-2xl w-full sm:w-11/12 max-w-2xl max-h-[95vh] sm:max-h-[90vh] overflow-hidden shadow-2xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag Handle for Mobile */}
        <div className="flex justify-center pt-3 pb-2 sm:hidden">
          <div className="w-12 h-1 bg-gray-300 rounded-full"></div>
        </div>

        {/* Header */}
        <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-purple-50">
          <div className="flex justify-between items-center">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-800">
              Poin Anda
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-3xl sm:text-4xl w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/50 transition-all duration-200 active:scale-90"
            >
              ×
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 bg-gray-50 shrink-0 overflow-x-auto">
          <div className="flex min-w-max">
            <button
              onClick={() => setActiveTab('summary')}
              className={`flex-1 py-3 sm:py-4 px-3 sm:px-4 text-center font-medium transition-all duration-300 text-xs sm:text-base relative whitespace-nowrap ${
                activeTab === 'summary'
                  ? 'text-blue-600'
                  : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
              }`}
            >
              <span>Ringkasan</span>
              {activeTab === 'summary' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-500 to-blue-600"></div>
              )}
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`flex-1 py-3 sm:py-4 px-3 sm:px-4 text-center font-medium transition-all duration-300 text-xs sm:text-base relative whitespace-nowrap ${
                activeTab === 'history'
                  ? 'text-blue-600'
                  : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
              }`}
            >
              <span>Riwayat</span>
              {activeTab === 'history' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-500 to-blue-600"></div>
              )}
            </button>
            <button
              onClick={() => setActiveTab('exchange')}
              className={`flex-1 py-3 sm:py-4 px-3 sm:px-4 text-center font-medium transition-all duration-300 text-xs sm:text-base relative whitespace-nowrap ${
                activeTab === 'exchange'
                  ? 'text-blue-600'
                  : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
              }`}
            >
              <span>Tukar Voucher</span>
              {activeTab === 'exchange' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-500 to-blue-600"></div>
              )}
            </button>
            <button
              onClick={() => setActiveTab('myvouchers')}
              className={`flex-1 py-3 sm:py-4 px-3 sm:px-4 text-center font-medium transition-all duration-300 text-xs sm:text-base relative whitespace-nowrap ${
                activeTab === 'myvouchers'
                  ? 'text-blue-600'
                  : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
              }`}
            >
              <span>Voucher Saya</span>
              {activeTab === 'myvouchers' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-500 to-blue-600"></div>
              )}
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1">
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-200 border-t-blue-500"></div>
            </div>
          ) : activeTab === 'summary' ? (
            <div className="space-y-4 sm:space-y-6">
              {/* Current Points Card */}
              <div className="bg-gradient-to-br from-blue-500 via-blue-600 to-purple-600 text-white rounded-2xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-40 h-40 bg-white opacity-5 rounded-full -mr-20 -mt-20"></div>
                <div className="absolute bottom-0 left-0 w-32 h-32 bg-white opacity-5 rounded-full -ml-16 -mb-16"></div>
                <div className="relative text-center">
                  <div className="text-5xl sm:text-6xl font-bold mb-2 sm:mb-3">
                    {pointsSummary?.current_points || 0}
                  </div>
                  <div className="text-blue-100 text-base sm:text-lg font-medium">Poin Tersedia</div>
                </div>
              </div>

              {/* Statistics */}
              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                <div className="bg-gradient-to-br from-gray-50 to-gray-100 p-4 sm:p-5 rounded-xl text-center shadow-sm hover:shadow-md transition-all duration-300 border border-gray-200">
                  <div className="text-2xl sm:text-3xl font-bold text-gray-800 mb-1">
                    {pointsSummary?.total_points_earned || 0}
                  </div>
                  <div className="text-xs sm:text-sm text-gray-600 font-medium">Total Poin<br className="sm:hidden"/> Diterima</div>
                </div>
                <div className="bg-gradient-to-br from-gray-50 to-gray-100 p-4 sm:p-5 rounded-xl text-center shadow-sm hover:shadow-md transition-all duration-300 border border-gray-200">
                  <div className="text-2xl sm:text-3xl font-bold text-gray-800 mb-1">
                    {pointsSummary?.orders_with_points || 0}
                  </div>
                  <div className="text-xs sm:text-sm text-gray-600 font-medium">Pembelian<br className="sm:hidden"/> Berhadiah</div>
                </div>
                <div className="bg-gradient-to-br from-gray-50 to-gray-100 p-4 sm:p-5 rounded-xl text-center shadow-sm hover:shadow-md transition-all duration-300 border border-gray-200">
                  <div className="text-2xl sm:text-3xl font-bold text-gray-800 mb-1">
                    {pointsSummary?.total_orders || 0}
                  </div>
                  <div className="text-xs sm:text-sm text-gray-600 font-medium">Total Pesanan</div>
                </div>
                <div className="bg-gradient-to-br from-gray-50 to-gray-100 p-4 sm:p-5 rounded-xl text-center shadow-sm hover:shadow-md transition-all duration-300 border border-gray-200">
                  <div className="text-lg sm:text-xl font-bold text-gray-800 mb-1 break-words">
                    {formatRupiah(pointsSummary?.total_spent || 0)}
                  </div>
                  <div className="text-xs sm:text-sm text-gray-600 font-medium">Total Pembelian</div>
                </div>
              </div>

              {/* Info */}
              <div className="bg-gradient-to-br from-yellow-50 to-amber-50 border-2 border-yellow-200 rounded-xl p-4 sm:p-5 shadow-sm">
                <h3 className="font-bold text-yellow-800 mb-3 text-base sm:text-lg">
                  Cara Mendapat Poin:
                </h3>
                <ul className="text-sm sm:text-base text-yellow-700 space-y-2 ml-1">
                  <li className="flex items-start gap-2">
                    <span className="text-yellow-600 mt-0.5">•</span>
                    <span>Pembelian Rp 15.000 - 99.999 = 1 poin</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-yellow-600 mt-0.5">•</span>
                    <span>Pembelian Rp 100.000 ke atas = 2 poin</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-yellow-600 mt-0.5">•</span>
                    <span>Poin didapat saat pesanan selesai</span>
                  </li>
                </ul>
              </div>
            </div>
          ) : activeTab === 'history' ? (
            <div className="space-y-3 sm:space-y-4">
              {pointsHistory.length === 0 ? (
                <div className="text-center py-12 sm:py-16 text-gray-500">
                  <p className="text-base sm:text-lg font-medium mb-2">Belum ada riwayat poin.</p>
                  <p className="text-sm sm:text-base text-gray-400">Mulai berbelanja untuk mendapat poin!</p>
                </div>
              ) : (
                <>
                  {pointsHistory.map((point) => (
                    <div 
                      key={point.id} 
                      className="border border-gray-200 rounded-xl p-4 sm:p-5 bg-white"
                    >
                      <div className="flex justify-between items-start gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center flex-wrap gap-2 mb-2">
                            <span className={`font-bold text-base sm:text-lg ${point.points_earned > 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {point.points_earned > 0 ? '+' : ''}{point.points_earned} poin
                            </span>
                            <span className="text-xs sm:text-sm bg-gradient-to-r from-gray-100 to-gray-200 text-gray-700 px-2.5 py-1 rounded-full font-medium">
                              {getPointsTypeLabel(point.points_type)}
                            </span>
                          </div>
                          <div className="text-gray-700 text-sm sm:text-base mb-2 font-medium">
                            {point.description}
                          </div>
                          {point.order_no && (
                            <div className="text-gray-500 text-xs sm:text-sm mb-1">
                              Pesanan: <span className="font-medium">{point.order_no}</span>
                            </div>
                          )}
                          {point.order_amount && (
                            <div className="text-gray-500 text-xs sm:text-sm">
                              Nilai: <span className="font-medium">{formatRupiah(point.order_amount)}</span>
                            </div>
                          )}
                        </div>
                        <div className="text-right text-xs sm:text-sm text-gray-400 shrink-0 mt-1">
                          {formatDate(point.created_at)}
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Pagination */}
                  {pagination.totalPages > 1 && (
                    <div className="flex justify-center items-center gap-3 sm:gap-4 mt-6 pt-4 border-t border-gray-200">
                      <button
                        onClick={() => handlePageChange(pagination.page - 1)}
                        disabled={pagination.page === 1}
                        className="px-4 sm:px-5 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-200 text-sm sm:text-base"
                      >
                        ‹ Prev
                      </button>
                      <span className="text-xs sm:text-sm text-gray-600 font-medium px-2 sm:px-3 py-2 bg-gray-50 rounded-lg">
                        {pagination.page} / {pagination.totalPages}
                      </span>
                      <button
                        onClick={() => handlePageChange(pagination.page + 1)}
                        disabled={!pagination.hasMore}
                        className="px-4 sm:px-5 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-200 text-sm sm:text-base"
                      >
                        Next ›
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          ) : activeTab === 'exchange' ? (
            /* Tukar Voucher Tab */
            <div className="space-y-4">
              {/* Current Points Display */}
              <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl p-4 text-center">
                <div className="text-3xl font-bold">{pointsSummary?.current_points || 0}</div>
                <div className="text-sm text-blue-100">Poin Tersedia</div>
              </div>

              {loadingVouchers ? (
                <div className="flex justify-center items-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-200 border-t-blue-500"></div>
                </div>
              ) : voucherRewards.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <p className="text-lg font-medium mb-2">Belum ada voucher tersedia.</p>
                  <p className="text-sm text-gray-400">Tunggu voucher baru dari kami!</p>
                </div>
              ) : (
                voucherRewards.map((reward) => (
                  <div 
                    key={reward.id}
                    className="border-2 border-gray-200 rounded-xl p-4 bg-white"
                  >
                    <div className="flex justify-between items-start gap-3 mb-3">
                      <div className="flex-1">
                        <h3 className="font-bold text-lg text-gray-800 mb-1">{reward.name}</h3>
                        <p className="text-sm text-gray-600 mb-2">{reward.description}</p>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs font-medium">
                            {reward.points_required} Poin
                          </span>
                          {reward.discount_type === 'percentage' && (
                            <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-medium">
                              {reward.discount_value}% OFF
                            </span>
                          )}
                          {reward.discount_type === 'fixed_amount' && (
                            <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-medium">
                              Rp {reward.discount_value.toLocaleString()} OFF
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {reward.min_order_amount > 0 && (
                      <div className="text-xs text-gray-500 mb-2">
                        Min. pembelian: Rp {reward.min_order_amount.toLocaleString()}
                      </div>
                    )}

                    <div className="text-xs text-gray-500 mb-3">
                      Berlaku {reward.valid_days} hari setelah ditukar
                    </div>

                    {!reward.in_stock ? (
                      <button
                        disabled
                        className="w-full bg-gray-300 text-gray-500 py-2 px-4 rounded-lg font-medium cursor-not-allowed"
                      >
                        Stok Habis
                      </button>
                    ) : !reward.can_redeem ? (
                      <button
                        disabled
                        className="w-full bg-gray-300 text-gray-500 py-2 px-4 rounded-lg font-medium cursor-not-allowed text-sm"
                      >
                        {reward.reason || 'Tidak dapat ditukar'}
                      </button>
                    ) : (
                      <button
                        onClick={() => handleRedeemVoucher(reward.id)}
                        disabled={redeeming === reward.id}
                        className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white py-2 px-4 rounded-lg font-medium hover:from-blue-600 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {redeeming === reward.id ? 'Menukar...' : 'Tukar Sekarang'}
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          ) : activeTab === 'myvouchers' ? (
            /* Voucher Saya Tab */
            <div className="space-y-4">
              {loadingMyVouchers ? (
                <div className="flex justify-center items-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-200 border-t-blue-500"></div>
                </div>
              ) : (
                <>
                  {/* Active Vouchers */}
                  {myVouchers.active.length > 0 && (
                    <div>
                      <h3 className="font-bold text-gray-800 mb-3">
                        Voucher Aktif ({myVouchers.active.length})
                      </h3>
                      <div className="space-y-3">
                        {myVouchers.active.map((voucher) => (
                          <div 
                            key={voucher.id}
                            className="border-2 border-green-200 bg-gradient-to-br from-green-50 to-white rounded-xl p-4 shadow-sm"
                          >
                            <div className="flex justify-between items-start mb-2">
                              <div className="flex-1">
                                <h4 className="font-bold text-gray-800">{voucher.voucher_name}</h4>
                                <p className="text-sm text-gray-600 mt-1">{voucher.description}</p>
                              </div>
                              <span className="bg-green-500 text-white px-2 py-1 rounded-md text-xs font-medium">
                                Aktif
                              </span>
                            </div>
                            <div className="bg-white border-2 border-dashed border-gray-300 rounded-lg p-3 mb-2">
                              <div className="text-xs text-gray-500 mb-1">Kode Voucher:</div>
                              <div className="flex items-center justify-between gap-2">
                                <div className="font-mono font-bold text-lg text-blue-600 tracking-wider">
                                  {voucher.voucher_code}
                                </div>
                                <button
                                  onClick={() => copyVoucherCode(voucher.voucher_code)}
                                  className="flex-shrink-0 bg-blue-500 hover:bg-blue-600 text-white p-2 rounded-lg transition-all active:scale-95 shadow-sm hover:shadow-md"
                                  title="Salin kode voucher"
                                >
                                  {copiedCode === voucher.voucher_code ? (
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                  ) : (
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                    </svg>
                                  )}
                                </button>
                              </div>
                            </div>
                            <div className="text-xs text-gray-500">
                              Berlaku hingga: {new Date(voucher.valid_until).toLocaleDateString('id-ID', {
                                year: 'numeric', month: 'long', day: 'numeric'
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Used Vouchers */}
                  {myVouchers.used.length > 0 && (
                    <div>
                      <h3 className="font-bold text-gray-800 mb-3">
                        Voucher Terpakai ({myVouchers.used.length})
                      </h3>
                      <div className="space-y-3">
                        {myVouchers.used.map((voucher) => (
                          <div 
                            key={voucher.id}
                            className="border border-gray-200 bg-gray-50 rounded-xl p-4 opacity-75"
                          >
                            <div className="flex justify-between items-start mb-2">
                              <div className="flex-1">
                                <h4 className="font-bold text-gray-700">{voucher.voucher_name}</h4>
                                <div className="flex items-center gap-2 mt-1">
                                  <div className="font-mono text-sm text-gray-500">{voucher.voucher_code}</div>
                                  <button
                                    onClick={() => copyVoucherCode(voucher.voucher_code)}
                                    className="flex-shrink-0 bg-gray-400 hover:bg-gray-500 text-white p-1 rounded transition-all active:scale-95"
                                    title="Salin kode voucher"
                                  >
                                    {copiedCode === voucher.voucher_code ? (
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                      </svg>
                                    ) : (
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                      </svg>
                                    )}
                                  </button>
                                </div>
                              </div>
                              <span className="bg-gray-400 text-white px-2 py-1 rounded-md text-xs font-medium">
                                Terpakai
                              </span>
                            </div>
                            {voucher.used_at && (
                              <div className="text-xs text-gray-500">
                                Digunakan: {new Date(voucher.used_at).toLocaleDateString('id-ID')}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Expired Vouchers */}
                  {myVouchers.expired.length > 0 && (
                    <div>
                      <h3 className="font-bold text-gray-800 mb-3">
                        Voucher Kadaluarsa ({myVouchers.expired.length})
                      </h3>
                      <div className="space-y-3">
                        {myVouchers.expired.map((voucher) => (
                          <div 
                            key={voucher.id}
                            className="border border-red-200 bg-red-50 rounded-xl p-4 opacity-60"
                          >
                            <div className="flex justify-between items-start mb-2">
                              <div className="flex-1">
                                <h4 className="font-bold text-gray-700">{voucher.voucher_name}</h4>
                                <div className="flex items-center gap-2 mt-1">
                                  <div className="font-mono text-sm text-gray-500">{voucher.voucher_code}</div>
                                  <button
                                    onClick={() => copyVoucherCode(voucher.voucher_code)}
                                    className="flex-shrink-0 bg-gray-400 hover:bg-gray-500 text-white p-1 rounded transition-all active:scale-95"
                                    title="Salin kode voucher"
                                  >
                                    {copiedCode === voucher.voucher_code ? (
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                      </svg>
                                    ) : (
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                      </svg>
                                    )}
                                  </button>
                                </div>
                              </div>
                              <span className="bg-red-400 text-white px-2 py-1 rounded-md text-xs font-medium">
                                Expired
                              </span>
                            </div>
                            <div className="text-xs text-red-600">
                              Kadaluarsa: {new Date(voucher.valid_until).toLocaleDateString('id-ID')}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Empty State */}
                  {myVouchers.active.length === 0 && myVouchers.used.length === 0 && myVouchers.expired.length === 0 && (
                    <div className="text-center py-12 text-gray-500">
                      <p className="text-lg font-medium mb-2">Belum ada voucher.</p>
                      <p className="text-sm text-gray-400">Tukar poin Anda untuk mendapatkan voucher!</p>
                    </div>
                  )}
                </>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default CustomerPointsModal;