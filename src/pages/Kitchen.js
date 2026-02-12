import React, { useState, useEffect } from 'react';
import AdminLayout from '../components/admin/AdminLayout';
import { staffAPI } from '../services/api';
import { notify } from '../components/common/Toast';
import ConfirmDialog from '../components/common/ConfirmDialog';
import Receipt from '../components/admin/Receipt';

const Kitchen = () => {
  const [orders, setOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  
  // State for confirm dialog
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    orderId: null,
    orderNo: '',
    status: '',
    title: '',
    message: ''
  });

  useEffect(() => {
    fetchKitchenQueue();
    const interval = setInterval(fetchKitchenQueue, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchKitchenQueue = async () => {
    try {
      const response = await staffAPI.getKitchenQueue();
      setOrders(response.data.orders);
    } catch (error) {
      console.error('Error fetching kitchen queue:', error);
      notify.error('Gagal memuat antrian kitchen');
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

  const updateStatus = async () => {
    try {
      await staffAPI.updateKitchenStatus(confirmDialog.orderId, confirmDialog.status);
      notify.success('Status berhasil diupdate');
      fetchKitchenQueue();
      if (selectedOrder && selectedOrder.order.id === confirmDialog.orderId) {
        fetchOrderDetail(confirmDialog.orderId);
      }
      closeConfirmDialog();
    } catch (error) {
      console.error('Error updating status:', error);
      notify.error('Gagal mengupdate status');
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      pending: { class: 'badge-warning', label: 'Pending', icon: '⏳' },
      confirmed: { class: 'badge-info', label: 'Confirmed', icon: '✓' },
      preparing: { class: 'badge-warning', label: 'Memasak', icon: '•' },
      ready: { class: 'badge-success', label: 'Siap', icon: '✓' },
      delivering: { class: 'badge-info', label: 'Dikirim', icon: '•' },
      delivered: { class: 'badge-success', label: 'Sampai', icon: '✓' },
      waiting_pickup: { class: 'badge-info', label: 'Tunggu Ambil', icon: '•' },
      picked_up: { class: 'badge-success', label: 'Diambil', icon: '✓' },
      completed: { class: 'badge-success', label: 'Selesai', icon: '✓' }
    };
    return badges[status] || { class: 'badge-gray', label: status, icon: '•' };
  };

  const getNextActions = (order) => {
    const { status } = order;
    const actions = [];

    // Kitchen hanya bertanggung jawab untuk proses memasak
    if (status === 'confirmed') {
      actions.push({
        label: 'Mulai Masak',
        status: 'preparing',
        className: 'btn-primary',
        icon: '•'
      });
    }

    if (status === 'preparing') {
      actions.push({
        label: 'Tandai Siap',
        status: 'ready',
        className: 'btn-success',
        icon: '✓'
      });
    }

    // Setelah ready, kitchen tidak bisa mengontrol lagi
    // Delivery, pickup, dan dine-in harus dihandle oleh staff lain

    return actions;
  };

  const formatRupiah = (number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(number);
  };

  const handlePrintReceipt = () => {
    if (selectedOrder) {
      setShowReceipt(true);
    }
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
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Kitchen Queue</h1>
            <p className="text-gray-600 mt-2">Kelola pesanan yang sedang diproses</p>
          </div>
          <button onClick={fetchKitchenQueue} className="btn-secondary flex items-center">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </button>
        </div>

        {orders.length === 0 ? (
          <div className="card text-center py-12">
            <svg className="mx-auto h-16 w-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
            </svg>
            <p className="mt-4 text-lg text-gray-600">Tidak ada pesanan dalam antrian</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {orders.map((order) => {
              const badge = getStatusBadge(order.status);
              const nextActions = getNextActions(order);
              
              return (
                <div key={order.id} className="card hover:shadow-lg transition-shadow">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">{order.order_no}</h3>
                      <p className="text-sm text-gray-500">{order.customer_name || 'Walk-in Customer'}</p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <span className={badge.class}>
                        {badge.icon} {badge.label}
                      </span>
                      <span className={`text-xs px-2 py-1 rounded ${
                        order.type === 'delivery' 
                          ? 'bg-blue-100 text-blue-800' 
                          : order.type === 'dine_in'
                          ? 'bg-purple-100 text-purple-800'
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {order.type === 'delivery' ? 'Delivery' : order.type === 'dine_in' ? 'Dine In' : 'Pickup'}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2 mb-4 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Total:</span>
                      <span className="font-medium">{formatRupiah(order.grand_total)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Waktu:</span>
                      <span className="font-medium">{new Date(order.created_at).toLocaleTimeString('id-ID')}</span>
                    </div>
                    {order.notes && (
                      <div className="pt-2 border-t">
                        <p className="text-gray-600 text-xs">Catatan:</p>
                        <p className="text-gray-900">{order.notes}</p>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <button
                      onClick={() => fetchOrderDetail(order.id)}
                      className="w-full btn-secondary text-sm py-2"
                    >
                      Lihat Detail
                    </button>

                    {nextActions.map((action, idx) => (
                      <button
                        key={idx}
                        onClick={() => openConfirmDialog(order.id, order.order_no, action.status)}
                        className={`w-full ${action.className} text-sm py-2 flex items-center justify-center gap-2`}
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
          <div className="bg-white rounded-xl max-w-2xl w-full p-6 my-8 max-h-[90vh] overflow-y-auto">
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
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-600">Order No:</p>
                      <p className="font-bold text-lg">{selectedOrder.order.order_no}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Status:</p>
                      <span className={`${getStatusBadge(selectedOrder.order.status).class} inline-block mt-1`}>
                        {getStatusBadge(selectedOrder.order.status).icon} {getStatusBadge(selectedOrder.order.status).label}
                      </span>
                    </div>
                    <div>
                      <p className="text-gray-600">Type:</p>
                      <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                        selectedOrder.order.type === 'delivery' 
                          ? 'bg-blue-100 text-blue-800' 
                          : selectedOrder.order.type === 'dine_in'
                          ? 'bg-purple-100 text-purple-800'
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {selectedOrder.order.type === 'delivery' ? 'Delivery' : selectedOrder.order.type === 'dine_in' ? 'Dine In' : 'Pickup'}
                      </span>
                    </div>
                    <div>
                      <p className="text-gray-600">Payment:</p>
                      <p className="font-medium uppercase">{selectedOrder.order.payment_method}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Customer:</p>
                      <p className="font-medium">{selectedOrder.order.customer_name || '-'}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Phone:</p>
                      <p className="font-medium">{selectedOrder.order.customer_phone || '-'}</p>
                    </div>
                  </div>
                </div>

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
                        {item.notes && (
                          <div className="mt-2 ml-11 text-sm text-orange-600 bg-orange-50 px-3 py-1 rounded">
                            <span className="font-medium">Note:</span> {item.notes}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

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

                <div className="border-t pt-4">
                  <div className="mb-4">
                    <button
                      onClick={handlePrintReceipt}
                      className="w-full btn-secondary text-sm py-3 flex items-center justify-center gap-2"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-2a2 2 0 00-2-2H9a2 2 0 00-2 2v2a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                      </svg>
                      <span>Cetak Struk</span>
                    </button>
                  </div>
                  
                  {getNextActions(selectedOrder.order).length > 0 ? (
                    <>
                      <h3 className="font-bold text-lg mb-3">Aksi Kitchen:</h3>
                      <div className="space-y-2">
                        {getNextActions(selectedOrder.order).map((action, idx) => (
                          <button
                            key={idx}
                            onClick={() => openConfirmDialog(
                              selectedOrder.order.id, 
                              selectedOrder.order.order_no, 
                              action.status
                            )}
                            className={`w-full ${action.className} text-sm py-3 flex items-center justify-center gap-2`}
                          >
                            <span>{action.icon}</span>
                            <span>{action.label}</span>
                          </button>
                        ))}
                      </div>
                    </>
                  ) : (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                      <svg className="mx-auto h-12 w-12 text-green-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <p className="text-sm font-medium text-green-800">Pesanan siap!</p>
                      <p className="text-xs text-green-600 mt-1">
                        {selectedOrder.order.type === 'delivery' && 'Menunggu driver untuk pengiriman'}
                        {selectedOrder.order.type === 'dine_in' && 'Menunggu waitstaff untuk antar ke meja'}
                        {selectedOrder.order.type !== 'delivery' && selectedOrder.order.type !== 'dine_in' && 'Menunggu customer untuk pickup'}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={closeConfirmDialog}
        onConfirm={updateStatus}
        title={confirmDialog.title}
        message={confirmDialog.message}
        confirmText="Ya, Lanjutkan"
        cancelText="Batal"
        type="primary"
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

export default Kitchen;