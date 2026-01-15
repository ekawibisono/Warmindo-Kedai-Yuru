import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { publicAPI } from '../services/api';

const OrderTracking = () => {
  const [searchParams] = useSearchParams();
  const [orderNo, setOrderNo] = useState('');
  const [token, setToken] = useState('');
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Auto-load order from URL params
  useEffect(() => {
    const urlOrderNo = searchParams.get('order');
    const urlToken = searchParams.get('token');
    // eslint-disable-next-line no-unused-vars
    const fromUpload = searchParams.get('uploaded');

    if (urlOrderNo && urlToken) {
      setOrderNo(urlOrderNo);
      setToken(urlToken);
      fetchOrder(urlOrderNo, urlToken);
    }
  }, [searchParams]);

  const fetchOrder = async (orderNumber, trackingToken) => {
    setError('');
    setLoading(true);

    try {
      const response = await publicAPI.getOrder(orderNumber, trackingToken);
      const orderData = response.data;

      if (orderData.order) {
        const transformedOrder = {
          ...orderData.order,
          payment: orderData.last_payment
        };
        setOrder(transformedOrder);
      } else {
        setOrder(orderData);
      }
    } catch (err) {
      const errorMessage = err.response?.data?.error || err.message || '';
      const httpStatus = err.response?.status;

      if (httpStatus === 410 ||
        errorMessage.includes('no longer available') ||
        errorMessage.includes('completed') ||
        errorMessage.includes('expired')) {
        setError(
          '✅ Pesanan Anda sudah selesai!\n\n' +
          'Tracking untuk pesanan ini sudah tidak tersedia karena pesanan Anda sudah selesai dan diterima.\n\n' +
          'Terima kasih telah memesan di Kedai Yuru! 🙏'
        );
      } else {
        setError('Pesanan tidak ditemukan. Periksa kembali nomor pesanan dan token Anda.');
      }

      setOrder(null);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    fetchOrder(orderNo, token);
  };

  const formatRupiah = (number) => {
    const num = Number(number);
    if (isNaN(num)) return 'Rp 0';

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

  const getWhatsAppLink = (orderNo, customerName) => {
    const waNumber = process.env.REACT_APP_WHATSAPP_NUMBER || '6285881315824';
    const message = `Halo Kak, Mau Menanyakan Tentang Pesanan Saya\n\nOrder ID: ${orderNo}\nNama: ${customerName}`;
    return `https://wa.me/${waNumber}?text=${encodeURIComponent(message)}`;
  };

  // Enhanced timeline steps for Delivery
  const getDeliveryTimeline = (paymentMethod) => {
    const isQRIS = paymentMethod === 'qris';
    
    return [
      {
        status: 'pending',
        label: 'Memproses Verifikasi Pembayaran',
        icon: '⏳',
        description: isQRIS ? 'Menunggu verifikasi bukti transfer QRIS' : 'Menunggu konfirmasi pembayaran'
      },
      {
        status: 'confirmed',
        label: 'Pembayaran Terkonfirmasi',
        icon: '✓',
        description: 'Pembayaran sudah dikonfirmasi, pesanan akan diproses'
      },
      {
        status: 'preparing',
        label: 'Memproses Memasak',
        icon: '🍳',
        description: 'Chef sedang memasak pesanan Anda'
      },
      {
        status: 'ready',
        label: 'Masakan Sudah Siap Dikirim',
        icon: '📦',
        description: 'Pesanan sudah siap dan menunggu kurir'
      },
      {
        status: 'delivering',
        label: 'Memproses Kirim Masakan',
        icon: '🚗',
        description: 'Pesanan sedang dalam perjalanan'
      },
      {
        status: 'delivered',
        label: 'Masakan Sudah Diterima',
        icon: '✓',
        description: 'Pesanan telah sampai di tujuan'
      },
      {
        status: 'completed',
        label: 'Terselesaikan',
        icon: '🎉',
        description: 'Pesanan selesai. Terima kasih!'
      }
    ];
  };

  // Enhanced timeline steps for Pickup
  const getPickupTimeline = (paymentMethod) => {
    const isQRIS = paymentMethod === 'qris';
    
    return [
      {
        status: 'pending',
        label: isQRIS ? 'Memproses Verifikasi Pembayaran' : 'Memproses Konfirmasi Ke Dapur',
        icon: '⏳',
        description: isQRIS ? 'Menunggu verifikasi bukti transfer QRIS' : 'Mengirim pesanan ke dapur'
      },
      {
        status: 'confirmed',
        label: isQRIS ? 'Pembayaran Terkonfirmasi' : 'Konfirmasi Diterima',
        icon: '✓',
        description: isQRIS ? 'Pembayaran sudah dikonfirmasi' : 'Pesanan diterima dapur'
      },
      {
        status: 'preparing',
        label: 'Memasak Pesanan Anda',
        icon: '🍳',
        description: 'Chef sedang memasak pesanan Anda dengan sepenuh hati'
      },
      {
        status: 'ready',
        label: 'Masakan Pesanan Anda Sudah Siap',
        icon: '✓',
        description: 'Pesanan Anda sudah siap untuk diambil'
      },
      {
        status: 'waiting_pickup',
        label: 'Menunggu Pesanan Di Ambil',
        icon: '🏪',
        description: 'Pesanan menunggu Anda untuk diambil di toko'
      },
      {
        status: 'picked_up',
        label: 'Pesanan Sudah Di Ambil',
        icon: '✓',
        description: 'Pesanan telah diambil oleh customer'
      },
      {
        status: 'completed',
        label: 'Terselesaikan',
        icon: '🎉',
        description: 'Pesanan selesai. Terima kasih!'
      }
    ];
  };

  // Get appropriate timeline based on order type and status
  const getTimeline = (orderType, paymentMethod, orderStatus) => {
    // If order is canceled/rejected, show rejected timeline
    if (orderStatus === 'canceled' || orderStatus === 'cancelled' || orderStatus === 'rejected') {
      return getRejectedTimeline(paymentMethod);
    }
    
    if (orderType === 'delivery') {
      return getDeliveryTimeline(paymentMethod);
    } else {
      return getPickupTimeline(paymentMethod);
    }
  };

  // Timeline for rejected/canceled orders
  const getRejectedTimeline = (paymentMethod) => {
    const isQRIS = paymentMethod === 'qris';
    
    return [
      {
        status: 'pending',
        label: isQRIS ? 'Menunggu Verifikasi' : 'Pesanan Dibuat',
        icon: '⏳',
        description: isQRIS ? 'Bukti pembayaran sedang diperiksa' : 'Pesanan sedang diproses'
      },
      {
        status: 'canceled',
        label: 'Pesanan Dibatalkan',
        icon: '❌',
        description: isQRIS 
          ? 'Pembayaran ditolak. Silakan hubungi admin untuk informasi lebih lanjut.'
          : 'Pesanan telah dibatalkan.'
      }
    ];
  };

  // Map backend status to timeline status
  const mapStatusToTimeline = (backendStatus, orderType) => {
    // Handle canceled/rejected status
    if (backendStatus === 'canceled' || backendStatus === 'cancelled' || backendStatus === 'rejected') {
      return 'canceled';
    }

    // For delivery
    if (orderType === 'delivery') {
      const deliveryMap = {
        'pending': 'pending',
        'confirmed': 'confirmed',
        'preparing': 'preparing',
        'ready': 'ready',
        'delivering': 'delivering',  // New status
        'delivered': 'delivered',    // New status
        'completed': 'completed'
      };
      return deliveryMap[backendStatus] || backendStatus;
    }
    
    // For pickup
    const pickupMap = {
      'pending': 'pending',
      'confirmed': 'confirmed',
      'preparing': 'preparing',
      'ready': 'ready',
      'waiting_pickup': 'waiting_pickup',  // New status
      'picked_up': 'picked_up',            // New status
      'completed': 'completed'
    };
    return pickupMap[backendStatus] || backendStatus;
  };

  // Get current step index in timeline
  const getCurrentStepIndex = (currentStatus, timeline) => {
    const index = timeline.findIndex(step => step.status === currentStatus);
    return index === -1 ? 0 : index;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-3xl mx-auto px-4 py-6">
          <div className="flex items-center">
            <a href="/menu" className="text-primary-600 hover:text-primary-700 mr-4">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </a>
            <h1 className="text-2xl font-bold text-gray-900">Lacak Pesanan</h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-3xl mx-auto px-4 py-8">
        {/* Search Form */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Masukkan Informasi Pesanan</h2>
          <form onSubmit={handleSearch} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nomor Pesanan
              </label>
              <input
                type="text"
                value={orderNo}
                onChange={(e) => setOrderNo(e.target.value)}
                className="input-field"
                placeholder="Contoh: ORD-20240112-001"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Token Tracking
              </label>
              <input
                type="text"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                className="input-field"
                placeholder="Token dari konfirmasi pesanan"
                required
              />
            </div>
            <button
              type="submit"
              className="btn-primary w-full"
              disabled={loading}
            >
              {loading ? 'Mencari...' : 'Lacak Pesanan'}
            </button>
          </form>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-6 rounded">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-700 whitespace-pre-line">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Order Details */}
        {order && (
          <div className="space-y-6">
            {/* Order Info Card */}
            <div className="bg-white rounded-xl shadow-md p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">{order.order_no}</h3>
                  <p className="text-sm text-gray-600">{formatDate(order.created_at)}</p>
                </div>
                <span className={`px-4 py-2 rounded-full text-sm font-medium ${
                  order.type === 'delivery' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                }`}>
                  {order.type === 'delivery' ? '🚗 Delivery' : '🏪 Pickup'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-600">Customer:</p>
                  <p className="font-medium text-gray-900">{order.customer_name || '-'}</p>
                </div>
                <div>
                  <p className="text-gray-600">Total:</p>
                  <p className="font-bold text-lg text-primary-600">{formatRupiah(order.grand_total)}</p>
                </div>
                <div>
                  <p className="text-gray-600">Payment:</p>
                  <p className="font-medium text-gray-900 uppercase">
                    {order.payment?.method || order.payment_method || '-'}
                  </p>
                </div>
                <div>
                  <p className="text-gray-600">Payment Status:</p>
                  <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                    order.payment?.status === 'verified' 
                      ? 'bg-green-100 text-green-800' 
                      : order.payment?.status === 'rejected'
                      ? 'bg-red-100 text-red-800'
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {order.payment?.status || 'pending'}
                  </span>
                </div>
              </div>

              {order.notes && (
                <div className="mt-4 p-3 bg-yellow-50 border-l-4 border-yellow-400 rounded">
                  <p className="text-sm text-gray-700">
                    <span className="font-medium">Catatan:</span> {order.notes}
                  </p>
                </div>
              )}
            </div>


            {/* Modern Responsive Timeline */}
            <div className="bg-gradient-to-br from-white to-gray-50 rounded-xl shadow-lg overflow-hidden">
              <div className="bg-gradient-to-r from-primary-600 to-primary-700 px-6 py-4">
                <h3 className="text-xl font-bold text-white flex items-center">
                  <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Status Pesanan
                </h3>
              </div>

              {(() => {
                const paymentMethod = order.payment?.method || order.payment_method;
                const timeline = getTimeline(order.type, paymentMethod, order.status);
                const currentStatus = mapStatusToTimeline(order.status, order.type);
                const currentIndex = getCurrentStepIndex(currentStatus, timeline);
                const isRejected = order.status === 'canceled' || order.status === 'cancelled' || order.status === 'rejected';

                return (
                  <div className="p-6">
                    {/* Desktop & Tablet: Horizontal Timeline */}
                    <div className="hidden md:block">
                      <div className="relative">
                        {/* Progress Bar */}
                        <div className="absolute top-6 left-0 right-0 h-1 bg-gray-200 rounded-full">
                          <div 
                            className={`h-full rounded-full transition-all duration-500 ease-out ${
                              isRejected 
                                ? 'bg-gradient-to-r from-red-500 to-red-600' 
                                : 'bg-gradient-to-r from-primary-500 to-primary-600'
                            }`}
                            style={{ width: `${(currentIndex / (timeline.length - 1)) * 100}%` }}
                          ></div>
                        </div>
                        
                        {/* Timeline Steps */}
                        <div className="relative flex justify-between">
                          {timeline.map((step, index) => {
                            const isCompleted = index <= currentIndex;
                            const isCurrent = index === currentIndex;
                            const isRejectedStep = isRejected && step.status === 'canceled';

                            return (
                              <div key={step.status} className="flex flex-col items-center" style={{ width: `${100 / timeline.length}%` }}>
                                {/* Icon */}
                                <div className={`relative z-10 flex items-center justify-center w-12 h-12 rounded-full border-4 transition-all duration-300 ${
                                  isRejectedStep
                                    ? 'bg-red-500 border-white shadow-lg scale-110'
                                    : isCompleted 
                                      ? isCurrent
                                        ? 'bg-primary-600 border-white shadow-lg scale-110 animate-pulse'
                                        : 'bg-primary-600 border-white shadow-md'
                                      : 'bg-white border-gray-300'
                                }`}>
                                  <span className={`text-xl ${isCompleted || isRejectedStep ? 'filter brightness-0 invert' : 'opacity-50'}`}>
                                    {step.icon}
                                  </span>
                                </div>

                                {/* Label */}
                                <div className="mt-3 text-center px-2">
                                  <p className={`text-xs sm:text-sm font-semibold mb-1 leading-tight ${
                                    isRejectedStep ? 'text-red-600' : isCurrent ? 'text-primary-600' : isCompleted ? 'text-gray-900' : 'text-gray-400'
                                  }`}>
                                    {step.label}
                                  </p>
                                  {isCurrent && !isRejected && (
                                    <span className="inline-block px-2 py-0.5 bg-primary-100 text-primary-700 text-xs rounded-full font-medium">
                                      Saat Ini
                                    </span>
                                  )}
                                  {isCompleted && !isCurrent && (
                                    <span className="inline-block text-green-600 text-xs font-medium">
                                      ✓ Selesai
                                    </span>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Current Step Description */}
                      <div className={`mt-8 p-4 rounded-lg border ${
                        isRejected 
                          ? 'bg-red-50 border-red-200' 
                          : 'bg-primary-50 border-primary-200'
                      }`}>
                        <p className="text-sm text-gray-700">
                          <span className={`font-semibold ${isRejected ? 'text-red-700' : 'text-primary-700'}`}>
                            Status saat ini:
                          </span> {timeline[currentIndex]?.description}
                        </p>
                      </div>
                    </div>

                    {/* Mobile: Simple Status Card */}
                    <div className="md:hidden">
                      {/* Compact Status Card */}
                      <div className={`rounded-xl p-4 border ${
                        isRejected 
                          ? 'bg-red-50 border-red-200' 
                          : 'bg-primary-50 border-primary-200'
                      }`}>
                        <div className="flex items-center gap-3">
                          {/* Icon */}
                          <div className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center ${
                            isRejected ? 'bg-red-500' : 'bg-primary-600'
                          }`}>
                            <span className="text-xl filter brightness-0 invert">
                              {timeline[currentIndex]?.icon}
                            </span>
                          </div>
                          
                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <p className={`text-xs font-medium ${isRejected ? 'text-red-600' : 'text-primary-600'}`}>
                              {isRejected ? 'DIBATALKAN' : `Step ${currentIndex + 1}/${timeline.length}`}
                            </p>
                            <p className="font-bold text-gray-900 truncate">
                              {timeline[currentIndex]?.label}
                            </p>
                          </div>

                          {/* Progress Circle */}
                          {!isRejected && (
                            <div className="flex-shrink-0 text-right">
                              <span className="text-lg font-bold text-primary-600">
                                {Math.round(((currentIndex + 1) / timeline.length) * 100)}%
                              </span>
                            </div>
                          )}
                        </div>
                        
                        {/* Description */}
                        <p className="text-xs text-gray-600 mt-2 pl-15">
                          {timeline[currentIndex]?.description}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Order Items */}
            <div className="bg-white rounded-xl shadow-md p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Detail Pesanan</h3>
              <div className="space-y-3">
                {order.items && order.items.map((item, index) => (
                  <div key={index} className="flex justify-between items-start border-b pb-3 last:border-b-0">
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{item.product_name_snapshot || 'Product'}</p>
                      {item.modifiers && item.modifiers.length > 0 && (
                        <div className="mt-1 text-sm text-gray-600">
                          {item.modifiers.map((mod, idx) => (
                            <span key={idx} className="block">
                              + {mod.modifier_name_snapshot}
                              {mod.price_delta > 0 && ` (+${formatRupiah(mod.price_delta)})`}
                            </span>
                          ))}
                        </div>
                      )}
                      <p className="text-sm text-gray-600 mt-1">Qty: {item.qty}</p>
                    </div>
                    <p className="font-medium text-gray-900">{formatRupiah(item.subtotal)}</p>
                  </div>
                ))}
              </div>
              
              {/* Summary dengan Diskon */}
              <div className="border-t pt-3 mt-3 space-y-2">
                {/* Subtotal */}
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-600">Subtotal</span>
                  <span className="text-gray-900">
                    {formatRupiah(
                      order.items?.reduce((sum, item) => sum + Number(item.subtotal || 0), 0) || 0
                    )}
                  </span>
                </div>
                
                {/* Diskon (jika ada) */}
                {order.discount_amount > 0 && (
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-green-600 flex items-center">
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                      </svg>
                      Diskon {order.discount_code && `(${order.discount_code})`}
                    </span>
                    <span className="text-green-600 font-medium">-{formatRupiah(order.discount_amount)}</span>
                  </div>
                )}
                
                {/* Total */}
                <div className="flex justify-between items-center pt-2 border-t">
                  <span className="font-bold text-gray-900">Total</span>
                  <span className="font-bold text-xl text-primary-600">{formatRupiah(order.grand_total)}</span>
                </div>
              </div>
            </div>

            {/* Contact Support */}
            <div className="bg-blue-50 rounded-xl p-6 text-center">
              <p className="text-gray-700 mb-4">Ada pertanyaan tentang pesanan Anda?</p>
              <a
                href={getWhatsAppLink(order.order_no, order.customer_name)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors"
              >
                <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
                Hubungi Kami
              </a>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default OrderTracking;