import React, { useState, useEffect } from 'react';
import AdminLayout from '../components/admin/AdminLayout';
import { staffAPI } from '../services/api';
import ConfirmDialog from '../components/common/ConfirmDialog';
import Receipt from '../components/admin/Receipt';
import notify from '../components/common/Toast';

const Orders = () => {
    const [orders, setOrders] = useState([]);
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [loading, setLoading] = useState(true);
    const [detailLoading, setDetailLoading] = useState(false);
    const [filter, setFilter] = useState('all');
    const [statusFilter, setStatusFilter] = useState('all');
    // const [showMaintenance, setShowMaintenance] = useState(false);

    // State for confirm dialog
    const [confirmDialog, setConfirmDialog] = useState({
        isOpen: false,
        orderId: null,
        orderNo: '',
        status: '',
        title: '',
        message: ''
    });

    // State for receipt
    const [showReceipt, setShowReceipt] = useState(false);

    useEffect(() => {
        fetchOrders();
        const interval = setInterval(fetchOrders, 30000);
        return () => clearInterval(interval);
    }, []);

    const fetchOrders = async () => {
        try {
            const response = await staffAPI.getAllOrders();
            setOrders(response.data.orders);
        } catch (error) {
            console.error('Error fetching orders:', error);
            notify.error('Gagal memuat data pesanan');
        } finally {
            setLoading(false);
        }
    };

    const fetchOrderDetail = async (orderId) => {
        setDetailLoading(true);
        try {
            const response = await staffAPI.getKitchenOrder(orderId);
            setSelectedOrder(response.data);
        } catch (error) {
            console.error('Error fetching order detail:', error);
            notify.error('Gagal memuat detail pesanan');
        } finally {
            setDetailLoading(false);
        }
    };

    const openConfirmDialog = (orderId, orderNo, status) => {
        const statusMessages = {
            'cancelled': {
                title: 'Tolak Pesanan?',
                message: `Yakin ingin menolak/membatalkan pesanan ${orderNo}? Tindakan ini tidak dapat dibatalkan.`
            },
            'verify_payment': {
                title: 'Verifikasi Pembayaran QRIS?',
                message: `Redirect ke halaman verifikasi pembayaran untuk pesanan ${orderNo}?`
            },
            'confirmed': {
                title: 'Konfirmasi Pesanan?',
                message: `Konfirmasi pesanan ${orderNo}?`
            },
            'preparing': {
                title: 'Mulai Memasak?',
                message: `Mulai memasak pesanan ${orderNo}?`
            },
            'ready': {
                title: 'Tandai Siap?',
                message: `Tandai pesanan ${orderNo} sebagai siap?`
            },
            'delivering': {
                title: 'Mulai Pengiriman?',
                message: `Mulai pengiriman untuk pesanan ${orderNo}?`
            },
            'delivered': {
                title: 'Tandai Terkirim?',
                message: `Pesanan ${orderNo} sudah sampai ke customer?`
            },
            'waiting_pickup': {
                title: 'Menunggu Diambil?',
                message: `Pesanan ${orderNo} sudah siap diambil?`
            },
            'picked_up': {
                title: 'Sudah Diambil?',
                message: `Pesanan ${orderNo} sudah diambil customer?`
            },
            'completed': {
                title: 'Selesaikan Pesanan?',
                message: `Tandai pesanan ${orderNo} sebagai selesai?`
            }
        };

        const dialogConfig = statusMessages[status] || {
            title: 'Update Status?',
            message: `Update status pesanan ${orderNo}?`
        };

        setConfirmDialog({
            isOpen: true,
            orderId,
            orderNo,
            status,
            title: dialogConfig.title,
            message: dialogConfig.message
        });
    };

    const closeConfirmDialog = () => {
        setConfirmDialog({
            isOpen: false,
            orderId: null,
            orderNo: '',
            status: '',
            title: '',
            message: ''
        });
    };
    const normalizeKitchenStatus = (s) => {
        if (!s) return s;
        const v = String(s).trim().toLowerCase();

        // perbaiki typo umum
        if (v === "canceled") return "cancelled";   // 1 L -> 2 L
        if (v === "cancel") return "cancelled";
        if (v === "complete") return "completed";

        return v;
    };

    const updateStatus = async () => {
        try {
            // Handle special case for payment verification
            if (confirmDialog.status === 'verify_payment') {
                // Redirect to payment verification page
                const paymentVerificationUrl = `/admin/payments?order=${confirmDialog.orderNo}`;
                window.open(paymentVerificationUrl, '_blank');
                notify.success('Membuka halaman verifikasi pembayaran');
                closeConfirmDialog();
                return;
            }
            
            const normalized = normalizeKitchenStatus(confirmDialog.status);
            await staffAPI.updateKitchenStatus(confirmDialog.orderId, normalized);
            notify.success('Status berhasil diupdate');
            fetchOrders();
            if (selectedOrder && selectedOrder.order.id === confirmDialog.orderId) {
                fetchOrderDetail(confirmDialog.orderId);
            }
            closeConfirmDialog();
        } catch (error) {
            console.error('Error updating status:', error);
            notify.error('Gagal mengupdate status');
        }
    };

    const getStatusInfo = (status, type) => {
        const isDelivery = type === 'delivery';
        const statusMap = {
            pending: { label: 'Pending', color: 'bg-yellow-100 text-yellow-800', icon: '⏳' },
            confirmed: { label: 'Confirmed', color: 'bg-blue-100 text-blue-800', icon: '✓' },
            preparing: { label: 'Memasak', color: 'bg-orange-100 text-orange-800', icon: '🍳' },
            ready: {
                label: 'Siap',
                color: 'bg-purple-100 text-purple-800',
                icon: '✓'
            },
            delivering: {
                label: 'Sedang Dikirim',
                color: 'bg-blue-100 text-blue-800',
                icon: '🚗'
            },
            delivered: {
                label: 'Sudah Sampai',
                color: 'bg-green-100 text-green-800',
                icon: '✓'
            },
            waiting_pickup: {
                label: 'Menunggu Diambil',
                color: 'bg-blue-100 text-blue-800',
                icon: '🏪'
            },
            picked_up: {
                label: 'Sudah Diambil',
                color: 'bg-green-100 text-green-800',
                icon: '✓'
            },
            completed: {
                label: isDelivery ? 'Terkirim' : 'Selesai',
                color: 'bg-green-100 text-green-800',
                icon: '🎉'
            },
            cancelled: {
                label: 'Dibatalkan',
                color: 'bg-red-100 text-red-800',
                icon: '✗'
            },
            canceled: {
                label: 'Dibatalkan',
                color: 'bg-red-100 text-red-800',
                icon: '✗'
            },
            draft: {
                label: 'Draft',
                color: 'bg-gray-100 text-gray-800',
                icon: '📝'
            }
        };
        return statusMap[status] || { label: status, color: 'bg-gray-100 text-gray-800', icon: '•' };
    };

    // Get next actions based on current status and order type
    const getNextActions = (order) => {
        const { status, type, payment_method } = order;
        const isDelivery = type === 'delivery';
        const actions = [];

        // Default to cash if payment_method is null/undefined
        const paymentType = payment_method || 'cash';

        // For QRIS payments with pending status - need payment verification
        if ((status === 'pending' || status === 'draft') && paymentType === 'qris') {
            actions.push({
                label: 'Verifikasi Pembayaran',
                status: 'verify_payment',
                className: 'bg-yellow-600 hover:bg-yellow-700',
                icon: '💳'
            });
        }

        // For QRIS payments - add confirm button after verification
        if (status === 'pending' && paymentType === 'qris') {
            actions.push({
                label: 'Konfirmasi Pesanan',
                status: 'confirmed',
                className: 'bg-green-600 hover:bg-green-700',
                icon: '✓'
            });
        }

        // For Cash payments with confirmed status - allow rejection
        if (status === 'confirmed' && paymentType === 'cash') {
            actions.push({
                label: 'Tolak Pesanan',
                status: 'cancelled',
                className: 'bg-red-600 hover:bg-red-700',
                icon: '✗'
            });
        }

        // Common flow for confirmed orders (regardless of payment method)
        if (status === 'confirmed') {
            actions.push({
                label: 'Mulai Masak',
                status: 'preparing',
                className: 'bg-primary-600 hover:bg-primary-700',
                icon: '🍳'
            });
        }

        if (status === 'preparing') {
            actions.push({
                label: 'Tandai Siap',
                status: 'ready',
                className: 'bg-green-600 hover:bg-green-700',
                icon: '✓'
            });
        }

        // Delivery specific
        if (isDelivery) {
            if (status === 'ready') {
                actions.push({
                    label: 'Mulai Kirim',
                    status: 'delivering',
                    className: 'bg-blue-600 hover:bg-blue-700',
                    icon: '🚗'
                });
            }

            if (status === 'delivering') {
                actions.push({
                    label: 'Sudah Sampai',
                    status: 'delivered',
                    className: 'bg-green-600 hover:bg-green-700',
                    icon: '✓'
                });
            }

            if (status === 'delivered') {
                actions.push({
                    label: 'Selesaikan',
                    status: 'completed',
                    className: 'bg-green-600 hover:bg-green-700',
                    icon: '🎉'
                });
            }
        }

        // Pickup specific
        if (!isDelivery) {
            if (status === 'ready') {
                actions.push({
                    label: 'Tunggu Diambil',
                    status: 'waiting_pickup',
                    className: 'bg-blue-600 hover:bg-blue-700',
                    icon: '🏪'
                });
            }

            if (status === 'waiting_pickup') {
                actions.push({
                    label: 'Sudah Diambil',
                    status: 'picked_up',
                    className: 'bg-green-600 hover:bg-green-700',
                    icon: '✓'
                });
            }

            if (status === 'picked_up') {
                actions.push({
                    label: 'Selesaikan',
                    status: 'completed',
                    className: 'bg-green-600 hover:bg-green-700',
                    icon: '🎉'
                });
            }
        }

        return actions;
    };

    const formatRupiah = (number) => {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0,
        }).format(number);
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleString('id-ID', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    // Filter untuk hanya menampilkan pesanan hari ini (logika sama dengan SalesReport)
    const getTodayOrders = (orders) => {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        return orders.filter(order => {
            const orderDate = new Date(order.created_at);
            return orderDate >= today;
        });
    };

    // Filter pesanan hanya hari ini terlebih dahulu
    const todayOrders = getTodayOrders(orders);

    // Kemudian filter berdasarkan tipe dan status
    const filteredOrders = todayOrders.filter(order => {
        // Type filter
        if (filter !== 'all' && order.type !== filter) return false;

        // Status filter
        if (statusFilter === 'active') {
            return !['completed', 'cancelled'].includes(order.status);
        }
        if (statusFilter === 'completed') {
            return order.status === 'completed';
        }

        return true;
    });

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
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Kelola Pesanan</h1>
                        <p className="text-gray-600 mt-2">
                            📅 Menampilkan pesanan hari ini: <span className="font-semibold text-primary-600">{new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
                        </p>
                        <p className="text-sm text-gray-500 mt-1">
                            Total pesanan hari ini: <span className="font-semibold">{todayOrders.length}</span> |
                            Ditampilkan: <span className="font-semibold">{filteredOrders.length}</span>
                        </p>
                    </div>
                    <button onClick={fetchOrders} className="btn-secondary flex items-center">
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        Refresh
                    </button>
                </div>

                {/* Filters */}
                <div className="card">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Tipe</label>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setFilter('all')}
                                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filter === 'all'
                                            ? 'bg-primary-600 text-white'
                                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                        }`}
                                >
                                    Semua
                                </button>
                                <button
                                    onClick={() => setFilter('delivery')}
                                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filter === 'delivery'
                                            ? 'bg-primary-600 text-white'
                                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                        }`}
                                >
                                    🚗 Delivery
                                </button>
                                <button
                                    onClick={() => setFilter('pickup')}
                                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filter === 'pickup'
                                            ? 'bg-primary-600 text-white'
                                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                        }`}
                                >
                                    🏪 Pickup
                                </button>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setStatusFilter('all')}
                                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${statusFilter === 'all'
                                            ? 'bg-primary-600 text-white'
                                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                        }`}
                                >
                                    Semua
                                </button>
                                <button
                                    onClick={() => setStatusFilter('active')}
                                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${statusFilter === 'active'
                                            ? 'bg-primary-600 text-white'
                                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                        }`}
                                >
                                    Active
                                </button>
                                <button
                                    onClick={() => setStatusFilter('completed')}
                                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${statusFilter === 'completed'
                                            ? 'bg-primary-600 text-white'
                                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                        }`}
                                >
                                    Completed
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {filteredOrders.length === 0 ? (
                    <div className="card text-center py-12">
                        <div className="text-6xl mb-4">📭</div>
                        <p className="text-gray-500">Tidak ada pesanan</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filteredOrders.map((order) => {
                            const statusInfo = getStatusInfo(order.status, order.type);
                            const nextActions = getNextActions(order);

                            return (
                                <div key={order.id} className="card hover:shadow-lg transition-shadow">
                                    <div className="flex justify-between items-start mb-3">
                                        <div>
                                            <p className="font-bold text-lg">{order.order_no}</p>
                                            <p className="text-sm text-gray-600">{order.customer_name || 'Walk-in'}</p>
                                        </div>
                                        <div className="text-right">
                                            <span className={`${statusInfo.color} px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1 mb-2`}>
                                                <span>{statusInfo.icon}</span>
                                                <span>{statusInfo.label}</span>
                                            </span>
                                            {/* Payment Method Badge */}
                                            <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                                                order.payment_method === 'qris' 
                                                    ? 'bg-blue-100 text-blue-800' 
                                                    : 'bg-green-100 text-green-800'
                                            }`}>
                                                {order.payment_method === 'qris' ? '💳 QRIS' : '💵 CASH'}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="space-y-2 text-sm mb-4">
                                        <div className="flex items-center text-gray-600">
                                            <span className="mr-2">
                                                {order.type === 'delivery' ? '🚗' : '🏪'}
                                            </span>
                                            <span>{order.type === 'delivery' ? 'Delivery' : 'Pickup'}</span>
                                        </div>
                                        <div className="flex items-center text-gray-600">
                                            <span className="mr-2">📞</span>
                                            <span>{order.customer_phone || '-'}</span>
                                        </div>
                                        <div className="flex items-center text-gray-600">
                                            <span className="mr-2">🕐</span>
                                            <span>{formatDate(order.created_at)}</span>
                                        </div>
                                        <div className="flex items-center font-bold text-primary-600">
                                            <span className="mr-2">💰</span>
                                            <span>{formatRupiah(order.grand_total)}</span>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <button
                                            onClick={() => fetchOrderDetail(order.id)}
                                            className="w-full btn-secondary py-2 text-sm"
                                        >
                                            👁️ Lihat Detail
                                        </button>

                                        {/* Dynamic action buttons */}
                                        {nextActions.map((action, idx) => (
                                            <button
                                                key={idx}
                                                onClick={() => openConfirmDialog(order.id, order.order_no, action.status)}
                                                className={`w-full ${action.className} text-white font-medium py-2 px-4 rounded-lg text-sm flex items-center justify-center gap-2`}
                                            >
                                                <span>{action.icon}</span>
                                                <span>{action.label}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Detail Modal */}
            {selectedOrder && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
                    <div className="bg-white rounded-xl max-w-3xl w-full p-6 my-8 max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-2xl font-bold text-gray-900">Detail Pesanan</h2>
                            <button onClick={() => setSelectedOrder(null)} className="text-gray-400 hover:text-gray-600">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        {detailLoading ? (
                            <div className="flex justify-center py-12">
                                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                {/* Order Info */}
                                <div className="bg-gray-50 p-4 rounded-lg">
                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                        <div>
                                            <p className="text-gray-600">Order No:</p>
                                            <p className="font-bold text-lg">{selectedOrder.order.order_no}</p>
                                        </div>
                                        <div>
                                            <p className="text-gray-600">Status:</p>
                                            {(() => {
                                                const statusInfo = getStatusInfo(selectedOrder.order.status, selectedOrder.order.type);
                                                return (
                                                    <span className={`${statusInfo.color} inline-block mt-1 px-3 py-1 rounded-full text-xs font-medium`}>
                                                        {statusInfo.icon} {statusInfo.label}
                                                    </span>
                                                );
                                            })()}
                                        </div>
                                        <div>
                                            <p className="text-gray-600">Type:</p>
                                            <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${selectedOrder.order.type === 'delivery'
                                                    ? 'bg-blue-100 text-blue-800'
                                                    : 'bg-green-100 text-green-800'
                                                }`}>
                                                {selectedOrder.order.type === 'delivery' ? '🚗 Delivery' : '🏪 Pickup'}
                                            </span>
                                        </div>
                                        <div>
                                            <p className="text-gray-600">Payment:</p>
                                            <span className={`inline-block mt-1 px-3 py-1 rounded-full text-xs font-medium ${
                                                selectedOrder.order.payment_method === 'qris' 
                                                    ? 'bg-blue-100 text-blue-800' 
                                                    : 'bg-green-100 text-green-800'
                                            }`}>
                                                {selectedOrder.order.payment_method === 'qris' ? '💳 QRIS' : '💵 CASH'}
                                            </span>
                                        </div>
                                        <div>
                                            <p className="text-gray-600">Customer:</p>
                                            <p className="font-medium">{selectedOrder.order.customer_name || '-'}</p>
                                        </div>
                                        <div>
                                            <p className="text-gray-600">Phone:</p>
                                            <p className="font-medium">{selectedOrder.order.customer_phone || '-'}</p>
                                        </div>
                                        <div className="col-span-2">
                                            <p className="text-gray-600">Order Time:</p>
                                            <p className="font-medium">{formatDate(selectedOrder.order.created_at)}</p>
                                        </div>
                                        {selectedOrder.order.type === 'delivery' && selectedOrder.order.delivery_address && (
                                            <div className="col-span-2">
                                                <p className="text-gray-600">Alamat Pengiriman:</p>
                                                <p className="text-gray-700 mt-1">{selectedOrder.order.delivery_address}</p>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Items */}
                                <div>
                                    <h3 className="font-bold text-lg mb-3">Items:</h3>
                                    <div className="space-y-3">
                                        {selectedOrder.items.map((item, idx) => (
                                            <div key={idx} className="border-l-4 border-primary-500 pl-4 py-2 bg-gray-50 rounded">
                                                <div className="flex items-center gap-3">
                                                    <span className="bg-primary-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold">
                                                        {item.qty}
                                                    </span>
                                                    <p className="font-bold text-lg">{item.product_name_snapshot}</p>
                                                </div>
                                                {item.modifiers && item.modifiers.length > 0 && (
                                                    <div className="mt-3 ml-11 space-y-1">
                                                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Add-ons / Level:</p>
                                                        {item.modifiers.map((mod, midx) => (
                                                            <div key={midx} className="flex items-center gap-2">
                                                                <svg className="w-4 h-4 text-primary-500" fill="currentColor" viewBox="0 0 20 20">
                                                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                                                </svg>
                                                                <span className="text-sm font-medium text-gray-700">
                                                                    {mod.modifier_name_snapshot}
                                                                    {mod.qty > 1 && <span className="text-primary-600 font-bold"> x{mod.qty}</span>}
                                                                </span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Notes */}
                                {selectedOrder.order.notes && (
                                    <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
                                        <div className="flex items-start">
                                            <svg className="w-5 h-5 text-yellow-600 mr-2 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                                            </svg>
                                            <div>
                                                <p className="text-sm font-bold text-yellow-800">Catatan Pesanan:</p>
                                                <p className="text-sm text-yellow-900 mt-1">{selectedOrder.order.notes}</p>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Action buttons in modal */}
                                <div className="border-t pt-4">
                                    {/* Print Receipt Button */}
                                    <button
                                        onClick={() => setShowReceipt(true)}
                                        // onClick={() => setShowMaintenance(true)}
                                        className="w-full mb-4 bg-gray-600 hover:bg-gray-700 text-white font-medium py-3 px-4 rounded-lg text-sm flex items-center justify-center gap-2"
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                                        </svg>
                                        <span>Cetak Struk</span>
                                    </button>
                                    {/* {showMaintenance && (
                                        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
                                            <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6 text-center animate-fade-in">
                                                <div className="text-4xl mb-3">🚧</div>

                                                <h2 className="text-lg font-semibold text-gray-800 mb-2">
                                                    Fitur Sedang Dalam Perbaikan
                                                </h2>

                                                <p className="text-sm text-gray-600 mb-5">
                                                    Mohon maaf, fitur cetak struk sedang kami perbaiki agar hasilnya lebih optimal 🙏
                                                </p>

                                                <button
                                                    onClick={() => setShowMaintenance(false)}
                                                    className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-lg text-sm font-medium"
                                                >
                                                    Mengerti
                                                </button>
                                            </div>
                                        </div>
                                    )} */}
                                    <h3 className="font-bold text-lg mb-3">Update Status:</h3>
                                    <div className="space-y-2">
                                        {getNextActions(selectedOrder.order).map((action, idx) => (
                                            <button
                                                key={idx}
                                                onClick={() => openConfirmDialog(
                                                    selectedOrder.order.id,
                                                    selectedOrder.order.order_no,
                                                    action.status
                                                )}
                                                className={`w-full ${action.className} text-white font-medium py-3 px-4 rounded-lg text-sm flex items-center justify-center gap-2`}
                                            >
                                                <span>{action.icon}</span>
                                                <span>{action.label}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Confirm Dialog */}
            <ConfirmDialog
                isOpen={confirmDialog.isOpen}
                onClose={closeConfirmDialog}
                onConfirm={updateStatus}
                title={confirmDialog.title}
                message={confirmDialog.message}
                confirmText={
                    confirmDialog.status === 'cancelled' 
                        ? 'Ya, Tolak' 
                        : confirmDialog.status === 'verify_payment'
                            ? 'Ya, Buka Verifikasi'
                            : 'Ya, Lanjutkan'
                }
                cancelText="Batal"
                type={
                    confirmDialog.status === 'cancelled' 
                        ? 'danger' 
                        : confirmDialog.status === 'verify_payment'
                            ? 'warning'
                            : 'primary'
                }
            />

            {/* Receipt Modal */}
            {showReceipt && selectedOrder && (
                <Receipt
                    order={selectedOrder.order}
                    items={selectedOrder.items}
                    onClose={() => setShowReceipt(false)}
                />
            )}
        </AdminLayout>
    );
};

export default Orders;