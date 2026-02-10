import React, { useState, useEffect } from 'react';
import AdminLayout from '../components/admin/AdminLayout';
import { staffAPI } from '../services/api';
import { notify } from '../components/common/Toast';
import ConfirmDialog from '../components/common/ConfirmDialog';

const CustomerPointsManagement = () => {
    const [loading, setLoading] = useState(true);
    const [customers, setCustomers] = useState([]);
    const [stats, setStats] = useState({});
    const [pagination, setPagination] = useState({});
    const [filters, setFilters] = useState({
        page: 1,
        limit: 20,
        sortBy: 'points_desc',
        search: '',
        minPoints: 0
    });

    const [showHistoryModal, setShowHistoryModal] = useState(false);
    const [showAdjustModal, setShowAdjustModal] = useState(false);
    const [selectedCustomer, setSelectedCustomer] = useState(null);
    const [customerHistory, setCustomerHistory] = useState([]);
    const [historyPagination, setHistoryPagination] = useState({});
    const [historyLoading, setHistoryLoading] = useState(false);

    const [adjustForm, setAdjustForm] = useState({
        points: '',
        reason: ''
    });

    useEffect(() => {
        fetchCustomers();
    }, [filters.page, filters.sortBy, filters.minPoints]);

    const fetchCustomers = async () => {
        setLoading(true);
        try {
            const res = await staffAPI.getCustomerPointsList(filters);
            setCustomers(res.data.data.customers || []);
            setStats(res.data.data.stats || {});
            setPagination(res.data.data.pagination || {});
        } catch (error) {
            console.error('Error fetching customers:', error);
            notify.error('Gagal memuat data customer');
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = (e) => {
        e.preventDefault();
        setFilters({ ...filters, page: 1 });
        fetchCustomers();
    };

    const handleFilterChange = (key, value) => {
        setFilters({ ...filters, [key]: value, page: 1 });
    };

    const handlePageChange = (newPage) => {
        setFilters({ ...filters, page: newPage });
    };

    const fetchCustomerHistory = async (customerId, page = 1) => {
        setHistoryLoading(true);
        try {
            const res = await staffAPI.getCustomerPointsHistory(customerId, page, 10);
            setCustomerHistory(res.data.data.history || []);
            setHistoryPagination(res.data.data.pagination || {});
            setSelectedCustomer(res.data.data.customer);
        } catch (error) {
            console.error('Error fetching history:', error);
            notify.error('Gagal memuat riwayat poin');
        } finally {
            setHistoryLoading(false);
        }
    };

    const handleViewHistory = (customer) => {
        setSelectedCustomer(customer);
        setShowHistoryModal(true);
        fetchCustomerHistory(customer.id);
    };

    const handleAdjustPoints = (customer) => {
        setSelectedCustomer(customer);
        setShowAdjustModal(true);
        setAdjustForm({ points: '', reason: '' });
    };

    const handleSubmitAdjustment = async (e) => {
        e.preventDefault();
        
        if (!adjustForm.points || adjustForm.points === '0') {
            notify.error('Masukkan jumlah poin yang akan disesuaikan');
            return;
        }

        if (!adjustForm.reason.trim()) {
            notify.error('Masukkan alasan penyesuaian');
            return;
        }

        try {
            await staffAPI.adjustCustomerPoints(selectedCustomer.id, {
                points: parseInt(adjustForm.points),
                reason: adjustForm.reason
            });
            
            notify.success('Poin berhasil disesuaikan');
            setShowAdjustModal(false);
            fetchCustomers();
        } catch (error) {
            console.error('Error adjusting points:', error);
            notify.error(error.response?.data?.error || 'Gagal menyesuaikan poin');
        }
    };

    const formatRupiah = (amount) => {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0
        }).format(amount || 0);
    };

    const formatDate = (dateString) => {
        if (!dateString) return '-';
        return new Date(dateString).toLocaleDateString('id-ID', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getSortLabel = (sortBy) => {
        const labels = {
            'points_desc': 'Poin Terbanyak',
            'points_asc': 'Poin Tersedikit',
            'orders_desc': 'Pesanan Terbanyak',
            'spent_desc': 'Pembelian Terbesar',
            'name_asc': 'Nama A-Z',
            'recent': 'Terbaru'
        };
        return labels[sortBy] || sortBy;
    };

    return (
        <AdminLayout>
            <div className="p-4 sm:p-6 lg:p-8">
                {/* Header */}
                <div className="mb-6">
                    <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-2">
                        🎯 Manajemen Poin Customer
                    </h1>
                    <p className="text-gray-600">Kelola dan pantau poin loyalitas customer</p>
                </div>

                {/* Statistics Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                    <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white p-6 rounded-xl shadow-lg">
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="text-sm font-medium opacity-90">Total Customer</h3>
                            <span className="text-2xl">👥</span>
                        </div>
                        <p className="text-3xl font-bold">{stats.customers_with_points || 0}</p>
                        <p className="text-xs opacity-80 mt-1">dengan poin aktif</p>
                    </div>

                    <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white p-6 rounded-xl shadow-lg">
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="text-sm font-medium opacity-90">Poin Beredar</h3>
                            <span className="text-2xl">💎</span>
                        </div>
                        <p className="text-3xl font-bold">{stats.total_points_in_circulation?.toLocaleString() || 0}</p>
                        <p className="text-xs opacity-80 mt-1">poin aktif</p>
                    </div>

                    <div className="bg-gradient-to-br from-green-500 to-green-600 text-white p-6 rounded-xl shadow-lg">
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="text-sm font-medium opacity-90">Total Diberikan</h3>
                            <span className="text-2xl">🎁</span>
                        </div>
                        <p className="text-3xl font-bold">{stats.total_points_earned_all_time?.toLocaleString() || 0}</p>
                        <p className="text-xs opacity-80 mt-1">sepanjang waktu</p>
                    </div>

                    <div className="bg-gradient-to-br from-orange-500 to-orange-600 text-white p-6 rounded-xl shadow-lg">
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="text-sm font-medium opacity-90">Rata-rata Poin</h3>
                            <span className="text-2xl">📊</span>
                        </div>
                        <p className="text-3xl font-bold">{stats.avg_points_per_customer || 0}</p>
                        <p className="text-xs opacity-80 mt-1">per customer</p>
                    </div>
                </div>

                {/* Filters and Search */}
                <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
                    <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
                        <div className="flex-1">
                            <input
                                type="text"
                                placeholder="Cari nama, email, atau nomor HP..."
                                value={filters.search}
                                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                        
                        <div className="flex gap-3">
                            <select
                                value={filters.sortBy}
                                onChange={(e) => handleFilterChange('sortBy', e.target.value)}
                                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                            >
                                <option value="points_desc">Poin Terbanyak</option>
                                <option value="points_asc">Poin Tersedikit</option>
                                <option value="orders_desc">Pesanan Terbanyak</option>
                                <option value="spent_desc">Pembelian Terbesar</option>
                                <option value="name_asc">Nama A-Z</option>
                                <option value="recent">Terbaru</option>
                            </select>

                            <select
                                value={filters.minPoints}
                                onChange={(e) => handleFilterChange('minPoints', e.target.value)}
                                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                            >
                                <option value="0">Semua Poin</option>
                                <option value="1">≥ 1 poin</option>
                                <option value="5">≥ 5 poin</option>
                                <option value="10">≥ 10 poin</option>
                                <option value="20">≥ 20 poin</option>
                                <option value="50">≥ 50 poin</option>
                            </select>

                            <button
                                type="submit"
                                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                            >
                                Cari
                            </button>
                        </div>
                    </form>
                </div>

                {/* Customer List */}
                <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                    {loading ? (
                        <div className="flex justify-center items-center py-12">
                            <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-200 border-t-blue-500"></div>
                        </div>
                    ) : customers.length === 0 ? (
                        <div className="text-center py-12 text-gray-500">
                            <div className="text-6xl mb-4">📋</div>
                            <p className="text-lg font-medium">Tidak ada data customer</p>
                        </div>
                    ) : (
                        <>
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Customer
                                            </th>
                                            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Poin Aktif
                                            </th>
                                            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Total Diterima
                                            </th>
                                            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Pesanan
                                            </th>
                                            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Total Belanja
                                            </th>
                                            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Terakhir Order
                                            </th>
                                            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Aksi
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {customers.map((customer) => (
                                            <tr key={customer.id} className="hover:bg-gray-50 transition-colors">
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center">
                                                        {customer.google_picture ? (
                                                            <img
                                                                src={customer.google_picture}
                                                                alt={customer.full_name}
                                                                className="w-10 h-10 rounded-full mr-3"
                                                            />
                                                        ) : (
                                                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-bold mr-3">
                                                                {customer.full_name?.charAt(0) || '?'}
                                                            </div>
                                                        )}
                                                        <div>
                                                            <div className="font-medium text-gray-900 flex items-center gap-2">
                                                                {customer.full_name || 'N/A'}
                                                                {customer.is_google_user && (
                                                                    <span className="text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full">
                                                                        Google
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <div className="text-sm text-gray-500">
                                                                {customer.email || customer.phone || '-'}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-bold bg-gradient-to-r from-blue-100 to-purple-100 text-blue-700">
                                                        {customer.current_points}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <span className="text-gray-600 font-medium">
                                                        {customer.total_points_earned}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <span className="text-gray-600">
                                                        {customer.total_orders}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <span className="text-gray-900 font-medium">
                                                        {formatRupiah(customer.total_spent)}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-center text-sm text-gray-500">
                                                    {formatDate(customer.last_order_at)}
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <div className="flex justify-center gap-2">
                                                        <button
                                                            onClick={() => handleViewHistory(customer)}
                                                            className="px-3 py-1 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors text-sm font-medium"
                                                        >
                                                            📜 Riwayat
                                                        </button>
                                                        <button
                                                            onClick={() => handleAdjustPoints(customer)}
                                                            className="px-3 py-1 bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200 transition-colors text-sm font-medium"
                                                        >
                                                            ⚙️ Atur
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Pagination */}
                            {pagination.totalPages > 1 && (
                                <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
                                    <div className="text-sm text-gray-600">
                                        Menampilkan {((pagination.page - 1) * filters.limit) + 1} - {Math.min(pagination.page * filters.limit, pagination.total)} dari {pagination.total} customer
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => handlePageChange(pagination.page - 1)}
                                            disabled={pagination.page === 1}
                                            className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                        >
                                            ‹ Prev
                                        </button>
                                        <div className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg font-medium">
                                            {pagination.page} / {pagination.totalPages}
                                        </div>
                                        <button
                                            onClick={() => handlePageChange(pagination.page + 1)}
                                            disabled={!pagination.hasMore}
                                            className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                        >
                                            Next ›
                                        </button>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>

            {/* History Modal */}
            {showHistoryModal && selectedCustomer && (
                <div 
                    className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex justify-center items-center z-50 p-4"
                    onClick={() => setShowHistoryModal(false)}
                >
                    <div 
                        className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden shadow-2xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="px-6 py-5 border-b bg-gradient-to-r from-blue-50 to-purple-50">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h2 className="text-2xl font-bold text-gray-800 mb-2">
                                        📜 Riwayat Poin
                                    </h2>
                                    <div className="flex items-center gap-3">
                                        {selectedCustomer.google_picture ? (
                                            <img
                                                src={selectedCustomer.google_picture}
                                                alt={selectedCustomer.full_name}
                                                className="w-10 h-10 rounded-full"
                                            />
                                        ) : (
                                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-bold">
                                                {selectedCustomer.full_name?.charAt(0) || '?'}
                                            </div>
                                        )}
                                        <div>
                                            <p className="font-medium text-gray-800">{selectedCustomer.full_name}</p>
                                            <p className="text-sm text-gray-500">{selectedCustomer.email || selectedCustomer.phone}</p>
                                        </div>
                                        <div className="ml-auto text-right">
                                            <p className="text-sm text-gray-600">Poin Aktif</p>
                                            <p className="text-2xl font-bold text-blue-600">{selectedCustomer.current_points}</p>
                                        </div>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setShowHistoryModal(false)}
                                    className="text-gray-400 hover:text-gray-600 text-3xl"
                                >
                                    ×
                                </button>
                            </div>
                        </div>

                        {/* Content */}
                        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
                            {historyLoading ? (
                                <div className="flex justify-center py-12">
                                    <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-200 border-t-blue-500"></div>
                                </div>
                            ) : customerHistory.length === 0 ? (
                                <div className="text-center py-12 text-gray-500">
                                    <div className="text-6xl mb-4">🎯</div>
                                    <p>Belum ada riwayat poin</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {customerHistory.map((item) => (
                                        <div key={item.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-all">
                                            <div className="flex justify-between items-start">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <span className={`font-bold text-lg ${item.points_earned > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                            {item.points_earned > 0 ? '+' : ''}{item.points_earned} poin
                                                        </span>
                                                        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                                                            {item.points_type}
                                                        </span>
                                                    </div>
                                                    <p className="text-gray-700 mb-1">{item.description}</p>
                                                    {item.order_no && (
                                                        <p className="text-sm text-gray-500">Pesanan: {item.order_no}</p>
                                                    )}
                                                    {item.order_amount && (
                                                        <p className="text-sm text-gray-500">Nilai: {formatRupiah(item.order_amount)}</p>
                                                    )}
                                                </div>
                                                <div className="text-right text-sm text-gray-400">
                                                    {formatDate(item.created_at)}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* History Pagination */}
                            {historyPagination.totalPages > 1 && (
                                <div className="flex justify-center gap-3 mt-6 pt-4 border-t">
                                    <button
                                        onClick={() => fetchCustomerHistory(selectedCustomer.id, historyPagination.page - 1)}
                                        disabled={historyPagination.page === 1}
                                        className="px-4 py-2 bg-gray-100 rounded-lg disabled:opacity-50"
                                    >
                                        ‹ Prev
                                    </button>
                                    <span className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg font-medium">
                                        {historyPagination.page} / {historyPagination.totalPages}
                                    </span>
                                    <button
                                        onClick={() => fetchCustomerHistory(selectedCustomer.id, historyPagination.page + 1)}
                                        disabled={!historyPagination.hasMore}
                                        className="px-4 py-2 bg-gray-100 rounded-lg disabled:opacity-50"
                                    >
                                        Next ›
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Adjust Points Modal */}
            {showAdjustModal && selectedCustomer && (
                <div 
                    className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex justify-center items-center z-50 p-4"
                    onClick={() => setShowAdjustModal(false)}
                >
                    <div 
                        className="bg-white rounded-2xl w-full max-w-md shadow-2xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="px-6 py-5 border-b bg-gradient-to-r from-orange-50 to-red-50">
                            <h2 className="text-2xl font-bold text-gray-800">⚙️ Atur Poin</h2>
                            <p className="text-sm text-gray-600 mt-1">
                                {selectedCustomer.full_name} - <span className="font-medium">Poin saat ini: {selectedCustomer.current_points}</span>
                            </p>
                        </div>

                        <form onSubmit={handleSubmitAdjustment} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Jumlah Poin
                                </label>
                                <input
                                    type="number"
                                    value={adjustForm.points}
                                    onChange={(e) => setAdjustForm({ ...adjustForm, points: e.target.value })}
                                    placeholder="Contoh: +10 atau -5"
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                                    required
                                />
                                <p className="text-xs text-gray-500 mt-1">
                                    Gunakan angka positif untuk menambah, negatif untuk mengurangi
                                </p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Alasan Penyesuaian
                                </label>
                                <textarea
                                    value={adjustForm.reason}
                                    onChange={(e) => setAdjustForm({ ...adjustForm, reason: e.target.value })}
                                    placeholder="Jelaskan alasan penyesuaian poin..."
                                    rows="3"
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                                    required
                                />
                            </div>

                            <div className="flex gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setShowAdjustModal(false)}
                                    className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
                                >
                                    Batal
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 px-4 py-2 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-lg hover:from-orange-600 hover:to-red-600 transition-colors font-medium"
                                >
                                    Simpan
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </AdminLayout>
    );
};

export default CustomerPointsManagement;
