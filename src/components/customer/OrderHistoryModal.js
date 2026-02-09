import React, { useState, useEffect, useCallback } from 'react';
import { publicAPI } from '../../services/api';
import { useCustomerAuth } from '../../contexts/CustomerAuthContext';

const OrderHistoryModal = ({ onClose }) => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    page: 1,
    totalPages: 1,
    total: 0,
    hasMore: false
  });

  const { customer } = useCustomerAuth();

  const fetchOrderHistory = useCallback(async (page = 1) => {
    try {
      setLoading(true);

      // Check if customer is logged in
      if (!customer) {
        setOrders([]);
        setLoading(false);
        return;
      }

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
      if (error.response?.status === 401) {
        setOrders([]);
      } else {
        setOrders([]);
      }
    } finally {
      setLoading(false);
    }
  }, [customer]); // Add customer dependency

  // Only fetch when modal opens and customer is available
  useEffect(() => {
    if (customer) {
      fetchOrderHistory();
    }
  }, [customer, fetchOrderHistory]); // Add fetchOrderHistory dependency

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

  // Hanya izinkan pelacakan untuk pesanan yang masih berjalan
  const isTrackableStatus = (status) => {
    const nonTrackable = [
      'completed',
      'delivered',
      'picked_up',
      'cancelled',
      'canceled',
      'rejected',
      'failed',
      'refunded'
    ];
    return !nonTrackable.includes(status?.toLowerCase());
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-2 md:p-4 backdrop-blur-sm">
      <div className="bg-white rounded-xl md:rounded-2xl shadow-2xl w-full max-w-2xl h-[95vh] md:h-[85vh] overflow-hidden transform transition-all duration-300 flex flex-col">
        {/* Enhanced Header */}
        <div className="bg-gradient-to-r from-purple-600 to-purple-700 text-white p-3 md:p-5 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 md:space-x-3">
              <div className="w-7 h-7 md:w-10 md:h-10 bg-white/20 backdrop-blur-sm rounded-lg md:rounded-xl flex items-center justify-center">
                <svg className="w-4 h-4 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                </svg>
              </div>
              <div>
                <h2 className="text-base md:text-xl font-bold">Riwayat Pesanan</h2>
                <p className="text-purple-100 text-xs md:text-sm mt-0.5">Total: {pagination.total} pesanan</p>
              </div>
            </div>
            <button 
              onClick={onClose} 
              className="text-white hover:text-purple-200 p-1.5 hover:bg-purple-800/50 rounded-lg transition-all duration-200"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Enhanced Content */}
        <div className="flex-1 overflow-hidden flex flex-col bg-gray-50">
          {loading && orders.length === 0 ? (
            <div className="flex-1 flex items-center justify-center p-4">
              <div className="text-center">
                <div className="w-10 h-10 md:w-12 md:h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <div className="animate-spin rounded-full h-5 w-5 md:h-6 md:w-6 border-2 md:border-3 border-purple-600 border-t-transparent"></div>
                </div>
                <p className="text-gray-600 font-medium text-sm">Memuat riwayat pesanan...</p>
                <p className="text-gray-400 text-xs mt-1">Mohon tunggu sebentar</p>
              </div>
            </div>
          ) : orders.length === 0 ? (
            <div className="flex-1 flex items-center justify-center p-4">
              <div className="text-center">
                <div className="w-12 h-12 md:w-16 md:h-16 bg-gray-100 rounded-xl md:rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <svg className="w-6 h-6 md:w-8 md:h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                  </svg>
                </div>
                <h3 className="text-sm md:text-base font-semibold text-gray-700 mb-2">Belum ada riwayat pesanan</h3>
                <p className="text-gray-500 mb-4 text-xs md:text-sm">Pesanan Anda akan muncul di sini setelah berbelanja</p>
                <button 
                  onClick={onClose}
                  className="bg-purple-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-purple-700 transition-colors text-sm"
                >
                  Mulai Belanja
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Scrollable Orders List */}
              <div className="flex-1 overflow-y-auto p-3 md:p-4">
                <div className="space-y-3">
                  {orders.map((order) => (
                <div key={order.id} className="bg-white rounded-lg md:rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-all duration-200 overflow-hidden">
                  {/* Order Header */}
                  <div className="bg-gradient-to-r from-gray-50 to-white p-3 md:p-4 border-b border-gray-100">
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <p className="font-bold text-sm md:text-base text-gray-900 truncate">{order.order_no}</p>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${getStatusColor(order.status)}`}>
                            {getStatusText(order.status, order.type)}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 flex items-center space-x-1">
                          <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span>{formatDate(order.created_at)}</span>
                        </p>
                      </div>
                      <div className="text-left sm:text-right">
                        <p className="text-xs text-gray-600 mb-0.5">Total Pembayaran</p>
                        <p className="text-base md:text-lg font-bold text-purple-600">
                          {formatRupiah(order.grand_total)}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Order Content */}
                  <div className="p-3 md:p-4">
                    {/* Order Items */}
                    <div className="space-y-2 md:space-y-3 mb-4">
                      {order.items?.slice(0, 3).map((item, idx) => (
                        <div key={idx} className="bg-gray-50 rounded-lg md:rounded-xl p-2.5 md:p-3">
                          <div className="flex justify-between items-start gap-2 md:gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center space-x-1.5 md:space-x-2 mb-1">
                                <span className="bg-purple-100 text-purple-700 text-xs font-bold px-1.5 py-0.5 md:px-2 rounded-full flex-shrink-0">
                                  {item.qty}x
                                </span>
                                <span className="font-medium text-gray-900 text-xs md:text-sm truncate">
                                  {item.product_name_snapshot}
                                </span>
                              </div>
                              {item.modifiers?.length > 0 && (
                                <p className="text-xs text-gray-500 ml-6 md:ml-8 line-clamp-1">
                                  + {item.modifiers.map(m => m.modifier_name_snapshot).join(', ')}
                                </p>
                              )}
                            </div>
                            <span className="text-xs md:text-sm font-bold text-gray-900 whitespace-nowrap">
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
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 pt-4 border-t border-gray-100">
                      <div className="flex items-center space-x-3 md:space-x-4 text-xs md:text-sm text-gray-600">
                        <div className="flex items-center space-x-1.5 md:space-x-2">
                          <div className={`w-6 h-6 md:w-8 md:h-8 rounded-lg flex items-center justify-center ${order.type === 'delivery' ? 'bg-blue-100 text-blue-600' : 'bg-green-100 text-green-600'}`}>
                            {order.type === 'delivery' ? (
                              <svg className="w-3 h-3 md:w-4 md:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                              </svg>
                            ) : (
                              <svg className="w-3 h-3 md:w-4 md:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                              </svg>
                            )}
                          </div>
                          <span className="font-medium text-xs md:text-sm">
                            {order.type === 'delivery' ? 'Delivery' : 'Pickup'}
                          </span>
                        </div>
                        <div className="w-px h-3 md:h-4 bg-gray-300"></div>
                        <span className="font-medium uppercase text-xs bg-gray-100 px-2 py-1 rounded-md">
                          {order.payment_method}
                        </span>
                      </div>
                      
                      <div className="flex items-center">
                        {order.public_tracking_token && isTrackableStatus(order.status) && (
                          <a
                            href={`/track?order=${order.order_no}&token=${order.public_tracking_token}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="bg-purple-100 text-purple-700 px-3 py-2 md:px-4 rounded-lg md:rounded-xl hover:bg-purple-200 transition-all duration-200 font-medium text-xs md:text-sm flex items-center space-x-1.5 md:space-x-2 w-full sm:w-auto justify-center"
                          >
                            <svg className="w-3 h-3 md:w-4 md:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                </div>
              </div>
              
              {/* Fixed Load More Button at Bottom */}
              {pagination.hasMore && (
                <div className="flex-shrink-0 p-3 md:p-4 bg-white border-t border-gray-200">
                  <button
                    onClick={loadMoreOrders}
                    disabled={loading}
                    className="w-full bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 disabled:from-gray-400 disabled:to-gray-500 text-white py-3 md:py-4 px-6 rounded-xl font-medium transition-all duration-200 disabled:opacity-50 shadow-sm hover:shadow-md"
                  >
                    {loading ? (
                      <span className="flex items-center justify-center space-x-2">
                        <div className="w-4 h-4 md:w-5 md:h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        <span className="text-sm md:text-base">Memuat pesanan...</span>
                      </span>
                    ) : (
                      <span className="flex items-center justify-center space-x-2">
                        <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                        <span className="text-sm md:text-base">Muat Lebih ({pagination.total - orders.length} tersisa)</span>
                      </span>
                    )}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default OrderHistoryModal;