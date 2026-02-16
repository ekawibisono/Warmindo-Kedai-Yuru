import React, { useState, useEffect, useCallback } from 'react';
import AdminLayout from '../components/admin/AdminLayout';
import { staffAPI } from '../services/api';

const AdminDashboard = () => {
  const [stats, setStats] = useState({
    categories: 0,
    products: 0,
    modifierGroups: 0,
    modifiers: 0,
    pendingPayments: 0,
    kitchenQueue: 0,
  });
  const [salesData, setSalesData] = useState({
    today: { total: 0, count: 0, avg: 0 },
    thisMonth: { total: 0, count: 0, avg: 0 },
    yesterday: { total: 0, count: 0 },
    lastMonth: { total: 0, count: 0 }
  });
  const [recentOrders, setRecentOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchSalesData = useCallback(async () => {
    try {
      // Get all completed orders from kitchen queue endpoint
      const response = await staffAPI.getAllOrders();
      const allOrders = response.data.orders || [];

      // Filter completed orders only
      const completedOrders = allOrders.filter(order => order.status === 'completed');

      // Calculate dates
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

      // Calculate today's sales
      const todayOrders = completedOrders.filter(order => {
        const orderDate = new Date(order.created_at);
        return orderDate >= today;
      });

      const todayTotal = todayOrders.reduce((sum, order) => sum + Number(order.grand_total), 0);
      const todayCount = todayOrders.length;
      const todayAvg = todayCount > 0 ? todayTotal / todayCount : 0;

      // Calculate yesterday's sales
      const yesterdayOrders = completedOrders.filter(order => {
        const orderDate = new Date(order.created_at);
        return orderDate >= yesterday && orderDate < today;
      });

      const yesterdayTotal = yesterdayOrders.reduce((sum, order) => sum + Number(order.grand_total), 0);
      const yesterdayCount = yesterdayOrders.length;

      // Calculate this month's sales
      const thisMonthOrders = completedOrders.filter(order => {
        const orderDate = new Date(order.created_at);
        return orderDate >= thisMonthStart;
      });

      const thisMonthTotal = thisMonthOrders.reduce((sum, order) => sum + Number(order.grand_total), 0);
      const thisMonthCount = thisMonthOrders.length;
      const thisMonthAvg = thisMonthCount > 0 ? thisMonthTotal / thisMonthCount : 0;

      // Calculate last month's sales
      const lastMonthOrders = completedOrders.filter(order => {
        const orderDate = new Date(order.created_at);
        return orderDate >= lastMonthStart && orderDate <= lastMonthEnd;
      });

      const lastMonthTotal = lastMonthOrders.reduce((sum, order) => sum + Number(order.grand_total), 0);
      const lastMonthCount = lastMonthOrders.length;

      setSalesData({
        today: {
          total: todayTotal,
          count: todayCount,
          avg: todayAvg
        },
        yesterday: {
          total: yesterdayTotal,
          count: yesterdayCount
        },
        thisMonth: {
          total: thisMonthTotal,
          count: thisMonthCount,
          avg: thisMonthAvg
        },
        lastMonth: {
          total: lastMonthTotal,
          count: lastMonthCount
        }
      });

    } catch (error) {
      // Error fetching sales data
    }
  }, []);

  const fetchRecentOrders = useCallback(async () => {
    try {
      const response = await staffAPI.getAllOrders();
      const orders = response.data.orders || [];

      // Batas waktu hari ini (local time / Asia/Jakarta di browser)
      const now = new Date();
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const startOfTomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

      // HANYA order yang dibuat hari ini
      const todayOrders = orders.filter((order) => {
        const d = new Date(order.created_at);
        return d >= startOfToday && d < startOfTomorrow;
      });

      // Get 5 most recent orders
      const sorted = todayOrders
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        .slice(0, 5);

      setRecentOrders(sorted);
    } catch (error) {
      // Error fetching recent orders
    }
  }, []);

  const fetchDashboardData = useCallback(async () => {
    try {
      // Fetch basic stats
      const [
        categoriesRes,
        productsRes,
        modifierGroupsRes,
        modifiersRes,
        paymentsRes,
        kitchenRes,
      ] = await Promise.all([
        staffAPI.getCategories(),
        staffAPI.getProducts(),
        staffAPI.getModifierGroups(),
        staffAPI.getModifiers(),
        staffAPI.getPendingPayments(),
        staffAPI.getKitchenQueue(),
      ]);

      setStats({
        categories: categoriesRes.data.length,
        products: productsRes.data.length,
        modifierGroups: modifierGroupsRes.data.length,
        modifiers: modifiersRes.data.length,
        pendingPayments: paymentsRes.data.payments.length,
        kitchenQueue: kitchenRes.data.orders.length,
      });

      // Fetch sales data
      await fetchSalesData();
      await fetchRecentOrders();

    } catch (error) {
      // Error fetching dashboard data
    } finally {
      setLoading(false);
    }
  }, [fetchSalesData, fetchRecentOrders]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const formatRupiah = (number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(number);
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';

    try {
      return new Date(dateString).toLocaleString('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return '-';
    }
  };

  const getGrowthPercentage = (current, previous) => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous * 100).toFixed(1);
  };

  const getStatusLabel = (status) => {
    const labels = {
      pending: 'Menunggu Pembayaran',
      paid: 'Sudah Dibayar',
      confirmed: 'Dikonfirmasi',
      preparing: 'Sedang Diproses',
      ready: 'Siap',
      waiting_pickup: 'Menunggu Pickup',
      picked_up: 'Sudah Diambil',
      delivering: 'Sedang Dikirim',
      completed: 'Selesai',
      cancelled: 'Dibatalkan'
    };
    return labels[status] || status;
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800',
      paid: 'bg-blue-100 text-blue-800',
      confirmed: 'bg-blue-100 text-blue-800',
      preparing: 'bg-orange-100 text-orange-800',
      ready: 'bg-purple-100 text-purple-800',
      waiting_pickup: 'bg-indigo-100 text-indigo-800',
      picked_up: 'bg-indigo-100 text-indigo-800',
      delivering: 'bg-cyan-100 text-cyan-800',
      completed: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

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
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-gray-600 mt-1 sm:mt-2 text-sm sm:text-base">
              {new Date().toLocaleDateString('id-ID', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </p>
          </div>
          <button
            onClick={fetchDashboardData}
            className="btn-secondary flex items-center justify-center text-sm sm:text-base"
          >
            <svg className="w-4 h-4 sm:w-5 sm:h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span className="hidden sm:inline">Refresh</span>
            <span className="sm:hidden">Refresh</span>
          </button>
        </div>

        {/* Sales Summary Cards */}
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-4">📊 Laporan Penjualan</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-6">
            {/* Today's Sales */}
            <div className="card bg-gradient-to-br from-blue-500 to-blue-600 text-white">
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1 min-w-0">
                  <p className="text-blue-100 text-sm">Penjualan Hari Ini</p>
                  <h3 className="text-2xl sm:text-3xl font-bold mt-2 break-words">{formatRupiah(salesData.today.total)}</h3>
                </div>
                <div className="bg-white bg-opacity-20 p-2 sm:p-3 rounded-lg flex-shrink-0">
                  <svg className="w-6 h-6 sm:w-8 sm:h-8" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" />
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-blue-100">{salesData.today.count} transaksi</p>
                  <p className="text-xs text-blue-200">Rata-rata: {formatRupiah(salesData.today.avg)}</p>
                </div>
                {salesData.yesterday.total > 0 && (
                  <div className={`flex items-center text-sm ${salesData.today.total >= salesData.yesterday.total ? 'text-green-200' : 'text-red-200'
                    }`}>
                    {salesData.today.total >= salesData.yesterday.total ? '↑' : '↓'}
                    {Math.abs(getGrowthPercentage(salesData.today.total, salesData.yesterday.total))}%
                  </div>
                )}
              </div>
            </div>

            {/* Yesterday's Sales */}
            <div className="card">
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1 min-w-0">
                  <p className="text-gray-600 text-sm">Penjualan Kemarin</p>
                  <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mt-2 break-words">{formatRupiah(salesData.yesterday.total)}</h3>
                </div>
                <div className="bg-gray-100 p-2 sm:p-3 rounded-lg flex-shrink-0">
                  <svg className="w-5 h-5 sm:w-6 sm:h-6 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
              <p className="text-sm text-gray-600">{salesData.yesterday.count} transaksi</p>
            </div>

            {/* This Month's Sales */}
            <div className="card bg-gradient-to-br from-green-500 to-green-600 text-white">
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1 min-w-0">
                  <p className="text-green-100 text-sm">Penjualan Bulan Ini</p>
                  <h3 className="text-2xl sm:text-3xl font-bold mt-2 break-words">{formatRupiah(salesData.thisMonth.total)}</h3>
                </div>
                <div className="bg-white bg-opacity-20 p-2 sm:p-3 rounded-lg flex-shrink-0">
                  <svg className="w-6 h-6 sm:w-8 sm:h-8" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-green-100">{salesData.thisMonth.count} transaksi</p>
                  <p className="text-xs text-green-200">Rata-rata: {formatRupiah(salesData.thisMonth.avg)}</p>
                </div>
                {salesData.lastMonth.total > 0 && (
                  <div className={`flex items-center text-sm ${salesData.thisMonth.total >= salesData.lastMonth.total ? 'text-green-200' : 'text-red-200'
                    }`}>
                    {salesData.thisMonth.total >= salesData.lastMonth.total ? '↑' : '↓'}
                    {Math.abs(getGrowthPercentage(salesData.thisMonth.total, salesData.lastMonth.total))}%
                  </div>
                )}
              </div>
            </div>

            {/* Last Month's Sales */}
            <div className="card">
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1 min-w-0">
                  <p className="text-gray-600 text-sm">Penjualan Bulan Lalu</p>
                  <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mt-2 break-words">{formatRupiah(salesData.lastMonth.total)}</h3>
                </div>
                <div className="bg-gray-100 p-2 sm:p-3 rounded-lg flex-shrink-0">
                  <svg className="w-5 h-5 sm:w-6 sm:h-6 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                    <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
              <p className="text-sm text-gray-600">{salesData.lastMonth.count} transaksi</p>
            </div>
          </div>
        </div>

        {/* System Stats */}
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-4">📈 Statistik Sistem</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
            <div className="card text-center">
              <div className="text-2xl sm:text-3xl mb-2">🏷️</div>
              <p className="text-xl sm:text-2xl font-bold text-gray-900">{stats.categories}</p>
              <p className="text-xs sm:text-sm text-gray-600">Kategori</p>
            </div>

            <div className="card text-center">
              <div className="text-2xl sm:text-3xl mb-2">📦</div>
              <p className="text-xl sm:text-2xl font-bold text-gray-900">{stats.products}</p>
              <p className="text-xs sm:text-sm text-gray-600">Produk</p>
            </div>

            <div className="card text-center">
              <div className="text-2xl sm:text-3xl mb-2">⚙️</div>
              <p className="text-xl sm:text-2xl font-bold text-gray-900">{stats.modifierGroups}</p>
              <p className="text-xs sm:text-sm text-gray-600">Modifier Groups</p>
            </div>

            <div className="card text-center">
              <div className="text-2xl sm:text-3xl mb-2">📋</div>
              <p className="text-xl sm:text-2xl font-bold text-gray-900">{stats.modifiers}</p>
              <p className="text-xs sm:text-sm text-gray-600">Modifiers</p>
            </div>

            <div className="card text-center">
              <div className="text-2xl sm:text-3xl mb-2">⏳</div>
              <p className="text-xl sm:text-2xl font-bold text-orange-600">{stats.pendingPayments}</p>
              <p className="text-xs sm:text-sm text-gray-600">Pending Payment</p>
            </div>

            <div className="card text-center">
              <div className="text-2xl sm:text-3xl mb-2">🍳</div>
              <p className="text-xl sm:text-2xl font-bold text-blue-600">{stats.kitchenQueue}</p>
              <p className="text-xs sm:text-sm text-gray-600">Kitchen Queue</p>
            </div>
          </div>
        </div>

        {/* Recent Orders */}
        <div className="card">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 sm:gap-0 mb-4">
            <h2 className="text-lg sm:text-xl font-bold text-gray-900">🕒 Pesanan Terbaru</h2>
            <a href="/admin/orders" className="text-primary-600 hover:text-primary-700 text-sm font-medium">
              Lihat Semua →
            </a>
          </div>

          {recentOrders.length > 0 ? (
            <>
              {/* Mobile Card View */}
              <div className="block lg:hidden space-y-4">
                {recentOrders.map((order) => (
                  <div key={order.id} className="border rounded-lg p-4 bg-white shadow-sm">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <div className="font-semibold text-gray-900 text-sm">{order.order_no}</div>
                        <div className="text-xs text-gray-500">{formatDate(order.created_at)}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-gray-900 text-sm">{formatRupiah(order.grand_total)}</div>
                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full mt-1 ${getStatusColor(order.status)}`}>
                          {getStatusLabel(order.status)}
                        </span>
                      </div>
                    </div>
                    <div className="text-sm text-gray-700">
                      <span className="font-medium">Customer:</span> {order.customer_name || 'Walk-in'}
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Desktop Table View */}
              <div className="hidden lg:block overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Order No
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Customer
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Waktu
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {recentOrders.map((order) => (
                    <tr key={order.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{order.order_no}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{order.customer_name || 'Walk-in'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-bold text-gray-900">{formatRupiah(order.grand_total)}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(order.status)}`}>
                          {getStatusLabel(order.status)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(order.created_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            </>
          ) : (
            <div className="text-center py-8 text-gray-500 text-sm sm:text-base">
              Belum ada pesanan hari ini
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminDashboard;