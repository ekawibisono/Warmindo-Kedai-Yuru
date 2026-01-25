import React, { useState, useEffect } from 'react';
import AdminLayout from '../components/admin/AdminLayout';
import { staffAPI } from '../services/api';
import { notify } from '../components/common/Toast';

const SalesReport = () => {
    const [loading, setLoading] = useState(true);
    const [orders, setOrders] = useState([]);
    const [filteredOrders, setFilteredOrders] = useState([]);
    const [showFilters, setShowFilters] = useState(false);
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

    // Filter states
    const [dateFilter, setDateFilter] = useState('today');
    const [customStartDate, setCustomStartDate] = useState('');
    const [customEndDate, setCustomEndDate] = useState('');
    const [statusFilter, setStatusFilter] = useState('completed');
    const [typeFilter, setTypeFilter] = useState('all');
    const [paymentMethodFilter, setPaymentMethodFilter] = useState('all');

    // Summary stats
    const [summary, setSummary] = useState({
        totalRevenue: 0,
        totalOrders: 0,
        averageOrder: 0,
        cashOrders: 0,
        qrisOrders: 0,
        pickupOrders: 0,
        deliveryOrders: 0
    });

    useEffect(() => {
        fetchOrders();
        
        const handleResize = () => {
            setIsMobile(window.innerWidth < 768);
        };
        
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        applyFilters();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [orders, dateFilter, customStartDate, customEndDate, statusFilter, typeFilter, paymentMethodFilter]);

    const fetchOrders = async () => {
        setLoading(true);
        try {
            const response = await staffAPI.getAllOrders();
            setOrders(response.data.orders || []);
        } catch (error) {
            console.error('Error fetching orders:', error);
            notify.error('Gagal memuat data pesanan');
        } finally {
            setLoading(false);
        }
    };

    const applyFilters = () => {
        let filtered = [...orders];

        // Date filter
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        switch (dateFilter) {
            case 'today':
                filtered = filtered.filter(order => {
                    const orderDate = new Date(order.created_at);
                    return orderDate >= today;
                });
                break;

            case 'yesterday':
                const yesterday = new Date(today);
                yesterday.setDate(yesterday.getDate() - 1);
                filtered = filtered.filter(order => {
                    const orderDate = new Date(order.created_at);
                    return orderDate >= yesterday && orderDate < today;
                });
                break;

            case 'this_week':
                const weekStart = new Date(today);
                weekStart.setDate(today.getDate() - today.getDay());
                filtered = filtered.filter(order => {
                    const orderDate = new Date(order.created_at);
                    return orderDate >= weekStart;
                });
                break;

            case 'this_month':
                const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
                filtered = filtered.filter(order => {
                    const orderDate = new Date(order.created_at);
                    return orderDate >= monthStart;
                });
                break;

            case 'last_month':
                const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
                filtered = filtered.filter(order => {
                    const orderDate = new Date(order.created_at);
                    return orderDate >= lastMonthStart && orderDate <= lastMonthEnd;
                });
                break;

            case 'custom':
                if (customStartDate && customEndDate) {
                    const start = new Date(customStartDate);
                    const end = new Date(customEndDate);
                    end.setHours(23, 59, 59, 999);
                    filtered = filtered.filter(order => {
                        const orderDate = new Date(order.created_at);
                        return orderDate >= start && orderDate <= end;
                    });
                }
                break;

            default:
                break;
        }

        // Status filter
        if (statusFilter !== 'all') {
            filtered = filtered.filter(order => order.status === statusFilter);
        }

        // Type filter
        if (typeFilter !== 'all') {
            filtered = filtered.filter(order => order.type === typeFilter);
        }

        // Payment method filter
        if (paymentMethodFilter !== 'all') {
            filtered = filtered.filter(order => order.payment_method === paymentMethodFilter);
        }

        setFilteredOrders(filtered);
        calculateSummary(filtered);
    };

    const calculateSummary = (orders) => {
        const completedOrders = orders.filter(o => o.status === 'completed');

        const totalRevenue = completedOrders.reduce((sum, order) => sum + Number(order.grand_total), 0);
        const totalOrders = completedOrders.length;
        const averageOrder = totalOrders > 0 ? totalRevenue / totalOrders : 0;

        const cashOrders = completedOrders.filter(o => o.payment_method === 'cash').length;
        const qrisOrders = completedOrders.filter(o => o.payment_method === 'qris').length;

        const pickupOrders = completedOrders.filter(o => o.type === 'pickup').length;
        const deliveryOrders = completedOrders.filter(o => o.type === 'delivery').length;

        setSummary({
            totalRevenue,
            totalOrders,
            averageOrder,
            cashOrders,
            qrisOrders,
            pickupOrders,
            deliveryOrders
        });
    };

    const formatRupiah = (number) => {
        const num = Number(number);
        if (!Number.isFinite(num) || isNaN(num)) return 'Rp 0';

        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0,
        }).format(num);
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

    const exportToCSV = () => {
        if (filteredOrders.length === 0) {
            notify.warning('Tidak ada data untuk diexport');
            return;
        }

        // Prepare CSV headers
        const headers = [
            'Order No',
            'Tanggal',
            'Customer',
            'Phone',
            'Tipe',
            'Payment Method',
            'Status',
            'Subtotal',
            'Diskon',
            'Pajak',
            'Grand Total'
        ];

        // Prepare CSV rows
        const rows = filteredOrders.map(order => [
            order.order_no,
            formatDate(order.created_at),
            order.customer_name || '-',
            order.customer_phone || '-',
            order.type === 'pickup' ? 'Pickup' : 'Delivery',
            order.payment_method === 'cash' ? 'Cash' : 'QRIS',
            order.status,
            order.subtotal || 0,
            order.discount_total || 0,
            order.tax_total || 0,
            order.grand_total
        ]);

        // Add summary row
        rows.push([]);
        rows.push(['SUMMARY']);
        rows.push(['Total Orders', filteredOrders.length]);
        rows.push(['Total Revenue (Completed)', formatRupiah(summary.totalRevenue)]);
        rows.push(['Average Order Value', formatRupiah(summary.averageOrder)]);
        rows.push(['Cash Orders', summary.cashOrders]);
        rows.push(['QRIS Orders', summary.qrisOrders]);
        rows.push(['Pickup Orders', summary.pickupOrders]);
        rows.push(['Delivery Orders', summary.deliveryOrders]);

        // Convert to CSV string
        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
        ].join('\n');

        // Create and download file
        const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);

        const filename = `sales-report-${dateFilter}-${new Date().toISOString().split('T')[0]}.csv`;

        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const getStatusColor = (status) => {
        const colors = {
            pending: 'bg-yellow-100 text-yellow-800',
            confirmed: 'bg-blue-100 text-blue-800',
            preparing: 'bg-orange-100 text-orange-800',
            ready: 'bg-purple-100 text-purple-800',
            completed: 'bg-green-100 text-green-800',
            cancelled: 'bg-red-100 text-red-800',
            draft: 'bg-gray-100 text-gray-800'
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
                        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">📊 Laporan Penjualan</h1>
                        <p className="text-gray-600 mt-1 sm:mt-2 text-sm sm:text-base">Analisis dan export data penjualan</p>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-3">
                        <button
                            onClick={() => setShowFilters(!showFilters)}
                            className="btn-secondary flex items-center justify-center sm:hidden"
                        >
                            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
                            </svg>
                            Filter & Export
                        </button>
                        <div className={`flex flex-col sm:flex-row gap-3 ${isMobile && !showFilters ? 'hidden' : ''}`}>
                            <button
                                onClick={fetchOrders}
                                className="btn-secondary flex items-center justify-center"
                            >
                                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                                <span className="hidden sm:inline">Refresh</span>
                                <span className="sm:hidden">Refresh</span>
                            </button>
                            <button
                                onClick={exportToCSV}
                                className="btn-primary flex items-center justify-center"
                            >
                                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                Export CSV
                            </button>
                        </div>
                    </div>
                </div>

                {/* Filters */}
                <div className={`card ${isMobile && !showFilters ? 'hidden' : ''}`}>
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-bold text-base sm:text-lg">🔍 Filter Data</h3>
                        <button
                            onClick={() => setShowFilters(false)}
                            className="sm:hidden text-gray-500 hover:text-gray-700"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        {/* Date Filter */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Periode</label>
                            <select
                                value={dateFilter}
                                onChange={(e) => setDateFilter(e.target.value)}
                                className="input-field"
                            >
                                <option value="today">Hari Ini</option>
                                <option value="yesterday">Kemarin</option>
                                <option value="this_week">Minggu Ini</option>
                                <option value="this_month">Bulan Ini</option>
                                <option value="last_month">Bulan Lalu</option>
                                <option value="custom">Custom Range</option>
                            </select>
                        </div>

                        {/* Status Filter */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                            <select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                                className="input-field"
                            >
                                <option value="all">Semua Status</option>
                                <option value="completed">Completed</option>
                                <option value="ready">Ready</option>
                                <option value="preparing">Preparing</option>
                                <option value="confirmed">Confirmed</option>
                                <option value="cancelled">Cancelled</option>
                            </select>
                        </div>

                        {/* Type Filter */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Tipe Order</label>
                            <select
                                value={typeFilter}
                                onChange={(e) => setTypeFilter(e.target.value)}
                                className="input-field"
                            >
                                <option value="all">Semua Tipe</option>
                                <option value="pickup">Pickup</option>
                                <option value="delivery">Delivery</option>
                            </select>
                        </div>

                        {/* Payment Method Filter */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Metode Bayar</label>
                            <select
                                value={paymentMethodFilter}
                                onChange={(e) => setPaymentMethodFilter(e.target.value)}
                                className="input-field"
                            >
                                <option value="all">Semua Metode</option>
                                <option value="cash">Cash</option>
                                <option value="qris">QRIS</option>
                            </select>
                        </div>
                    </div>

                    {/* Custom Date Range */}
                    {dateFilter === 'custom' && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4 pt-4 border-t">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Tanggal Mulai</label>
                                <input
                                    type="date"
                                    value={customStartDate}
                                    onChange={(e) => setCustomStartDate(e.target.value)}
                                    className="input-field"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Tanggal Akhir</label>
                                <input
                                    type="date"
                                    value={customEndDate}
                                    onChange={(e) => setCustomEndDate(e.target.value)}
                                    className="input-field"
                                />
                            </div>
                        </div>
                    )}
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-6">
                    <div className="card bg-gradient-to-br from-blue-500 to-blue-600 text-white">
                        <div className="text-sm opacity-90 mb-1">Total Revenue</div>
                        <div className="text-2xl sm:text-3xl font-bold break-words">{formatRupiah(summary.totalRevenue)}</div>
                        <div className="text-xs opacity-75 mt-2">Dari {summary.totalOrders} completed orders</div>
                    </div>

                    <div className="card bg-gradient-to-br from-green-500 to-green-600 text-white">
                        <div className="text-sm opacity-90 mb-1">Rata-rata Order</div>
                        <div className="text-2xl sm:text-3xl font-bold break-words">{formatRupiah(summary.averageOrder)}</div>
                        <div className="text-xs opacity-75 mt-2">Per transaksi</div>
                    </div>

                    <div className="card">
                        <div className="text-sm text-gray-600 mb-1">Payment Methods</div>
                        <div className="flex justify-between items-center">
                            <div>
                                <div className="text-xl font-bold text-gray-900">{summary.cashOrders}</div>
                                <div className="text-xs text-gray-600">💵 Cash</div>
                            </div>
                            <div>
                                <div className="text-xl font-bold text-gray-900">{summary.qrisOrders}</div>
                                <div className="text-xs text-gray-600">📱 QRIS</div>
                            </div>
                        </div>
                    </div>

                    <div className="card">
                        <div className="text-sm text-gray-600 mb-1">Order Types</div>
                        <div className="flex justify-between items-center">
                            <div>
                                <div className="text-xl font-bold text-gray-900">{summary.pickupOrders}</div>
                                <div className="text-xs text-gray-600">🏪 Pickup</div>
                            </div>
                            <div>
                                <div className="text-xl font-bold text-gray-900">{summary.deliveryOrders}</div>
                                <div className="text-xs text-gray-600">🚚 Delivery</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Orders Table */}
                <div className="card">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="font-bold text-base sm:text-lg">📋 Data Pesanan ({filteredOrders.length})</h3>
                    </div>

                    {filteredOrders.length === 0 ? (
                        <div className="text-center py-8 sm:py-12 text-gray-500">
                            <div className="text-4xl sm:text-5xl mb-4">📭</div>
                            <p className="text-sm sm:text-base">Tidak ada data dengan filter yang dipilih</p>
                        </div>
                    ) : (
                        <>
                            {/* Mobile Card View */}
                            <div className="block lg:hidden space-y-4">
                                {filteredOrders.map((order) => (
                                    <div key={order.id} className="border rounded-lg p-4 bg-white shadow-sm">
                                        <div className="flex justify-between items-start mb-3">
                                            <div>
                                                <div className="font-semibold text-gray-900">{order.order_no}</div>
                                                <div className="text-xs text-gray-500">{formatDate(order.created_at)}</div>
                                            </div>
                                            <div className="text-right">
                                                <div className="font-bold text-gray-900">{formatRupiah(order.grand_total)}</div>
                                                <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(order.status)}`}>
                                                    {order.status}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-3 text-sm">
                                            <div>
                                                <div className="text-gray-500">Customer:</div>
                                                <div className="text-gray-900">{order.customer_name || '-'}</div>
                                                <div className="text-xs text-gray-500">{order.customer_phone || '-'}</div>
                                            </div>
                                            <div>
                                                <div className="text-gray-500">Info:</div>
                                                <div className="text-gray-900">
                                                    {order.type === 'pickup' ? '🏪 Pickup' : '🚚 Delivery'}
                                                </div>
                                                <div className="text-gray-900">
                                                    {order.payment_method === 'cash' ? '💵 Cash' : '📱 QRIS'}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Desktop Table View */}
                            <div className="hidden lg:block overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order No</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tanggal</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tipe</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Payment</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {filteredOrders.map((order) => (
                                            <tr key={order.id} className="hover:bg-gray-50">
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="text-sm font-medium text-gray-900">{order.order_no}</div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="text-sm text-gray-900">{formatDate(order.created_at)}</div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="text-sm text-gray-900">{order.customer_name || '-'}</div>
                                                    <div className="text-xs text-gray-500">{order.customer_phone || '-'}</div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="text-sm text-gray-900">
                                                        {order.type === 'pickup' ? '🏪 Pickup' : '🚚 Delivery'}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="text-sm text-gray-900">
                                                        {order.payment_method === 'cash' ? '💵 Cash' : '📱 QRIS'}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(order.status)}`}>
                                                        {order.status}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-right">
                                                    <div className="text-sm font-bold text-gray-900">{formatRupiah(order.grand_total)}</div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </AdminLayout>
    );
};

export default SalesReport;