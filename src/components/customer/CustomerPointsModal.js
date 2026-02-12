import React, { useState, useEffect, useCallback } from 'react';
import { publicAPI } from '../../services/api';
import { useCustomerAuth } from '../../contexts/CustomerAuthContext';

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

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      if (activeTab === 'summary') {
        await fetchPointsSummary();
      } else {
        await fetchPointsHistory();
      }
      setLoading(false);
    };

    if (customer) {
      fetchData();
    }
  }, [customer, activeTab, fetchPointsSummary, fetchPointsHistory]);

  const handlePageChange = (newPage) => {
    fetchPointsHistory(newPage);
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
            <div className="text-6xl mb-4">🎯</div>
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
      className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex justify-center items-end sm:items-center z-50 p-0 sm:p-4 animate-fadeIn"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-t-3xl sm:rounded-2xl w-full sm:w-11/12 max-w-2xl max-h-[95vh] sm:max-h-[90vh] overflow-hidden shadow-2xl animate-slideUp flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag Handle for Mobile */}
        <div className="flex justify-center pt-3 pb-2 sm:hidden">
          <div className="w-12 h-1 bg-gray-300 rounded-full"></div>
        </div>

        {/* Header */}
        <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-purple-50">
          <div className="flex justify-between items-center">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-800 flex items-center gap-2">
              <span className="text-2xl sm:text-3xl">🎯</span>
              <span>Poin Anda</span>
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
        <div className="border-b border-gray-200 bg-gray-50 shrink-0">
          <div className="flex">
            <button
              onClick={() => setActiveTab('summary')}
              className={`flex-1 py-3 sm:py-4 px-3 sm:px-4 text-center font-medium transition-all duration-300 text-sm sm:text-base relative ${
                activeTab === 'summary'
                  ? 'text-blue-600'
                  : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
              }`}
            >
              <span className="inline-flex items-center gap-1.5 sm:gap-2">
                <span className="text-lg sm:text-xl">📊</span>
                <span>Ringkasan</span>
              </span>
              {activeTab === 'summary' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-500 to-blue-600"></div>
              )}
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`flex-1 py-3 sm:py-4 px-3 sm:px-4 text-center font-medium transition-all duration-300 text-sm sm:text-base relative ${
                activeTab === 'history'
                  ? 'text-blue-600'
                  : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
              }`}
            >
              <span className="inline-flex items-center gap-1.5 sm:gap-2">
                <span className="text-lg sm:text-xl">📜</span>
                <span>Riwayat</span>
              </span>
              {activeTab === 'history' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-500 to-blue-600"></div>
              )}
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1">
          {loading ? (
            <div className="flex justify-center items-center py-12 sm:py-16">
              <div className="relative">
                <div className="animate-spin rounded-full h-12 w-12 sm:h-16 sm:w-16 border-4 border-gray-200"></div>
                <div className="animate-spin rounded-full h-12 w-12 sm:h-16 sm:w-16 border-4 border-blue-500 border-t-transparent absolute top-0 left-0"></div>
              </div>
            </div>
          ) : activeTab === 'summary' ? (
            <div className="space-y-4 sm:space-y-6">
              {/* Current Points Card */}
              <div className="bg-gradient-to-br from-blue-500 via-blue-600 to-purple-600 text-white rounded-2xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-40 h-40 bg-white opacity-5 rounded-full -mr-20 -mt-20"></div>
                <div className="absolute bottom-0 left-0 w-32 h-32 bg-white opacity-5 rounded-full -ml-16 -mb-16"></div>
                <div className="relative text-center">
                  <div className="text-5xl sm:text-6xl font-bold mb-2 sm:mb-3 drop-shadow-lg animate-pulse">
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
                <h3 className="font-bold text-yellow-800 mb-3 flex items-center gap-2 text-base sm:text-lg">
                  <span className="text-xl sm:text-2xl">🎁</span>
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
          ) : (
            <div className="space-y-3 sm:space-y-4">
              {pointsHistory.length === 0 ? (
                <div className="text-center py-12 sm:py-16 text-gray-500">
                  <div className="text-6xl sm:text-7xl mb-4 animate-bounce">🎯</div>
                  <p className="text-base sm:text-lg font-medium mb-2">Belum ada riwayat poin.</p>
                  <p className="text-sm sm:text-base text-gray-400">Mulai berbelanja untuk mendapat poin!</p>
                </div>
              ) : (
                <>
                  {pointsHistory.map((point) => (
                    <div 
                      key={point.id} 
                      className="border border-gray-200 rounded-xl p-4 sm:p-5 hover:shadow-lg transition-all duration-300 bg-gradient-to-br from-white to-gray-50"
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
                            <div className="text-gray-500 text-xs sm:text-sm flex items-center gap-1.5 mb-1">
                              <span className="text-blue-500">📦</span>
                              <span>Pesanan: <span className="font-medium">{point.order_no}</span></span>
                            </div>
                          )}
                          {point.order_amount && (
                            <div className="text-gray-500 text-xs sm:text-sm flex items-center gap-1.5">
                              <span className="text-green-500">💰</span>
                              <span>Nilai: <span className="font-medium">{formatRupiah(point.order_amount)}</span></span>
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
                        className="px-4 sm:px-5 py-2 sm:py-2.5 bg-gradient-to-r from-gray-100 to-gray-200 text-gray-700 rounded-xl font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:from-gray-200 hover:to-gray-300 transition-all duration-300 shadow-sm hover:shadow-md active:scale-95 text-sm sm:text-base"
                      >
                        ‹ Prev
                      </button>
                      <span className="text-xs sm:text-sm text-gray-600 font-medium px-2 sm:px-3 py-2 bg-gray-50 rounded-lg">
                        {pagination.page} / {pagination.totalPages}
                      </span>
                      <button
                        onClick={() => handlePageChange(pagination.page + 1)}
                        disabled={!pagination.hasMore}
                        className="px-4 sm:px-5 py-2 sm:py-2.5 bg-gradient-to-r from-gray-100 to-gray-200 text-gray-700 rounded-xl font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:from-gray-200 hover:to-gray-300 transition-all duration-300 shadow-sm hover:shadow-md active:scale-95 text-sm sm:text-base"
                      >
                        Next ›
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CustomerPointsModal;