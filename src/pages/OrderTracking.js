import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { publicAPI } from '../services/api';

const OrderTracking = () => {
  const [searchParams] = useSearchParams();
  const [orderNo, setOrderNo] = useState('');
  const [token, setToken] = useState('');
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // WebSocket real-time states - simplified
  const [wsConnected, setWsConnected] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const pollingIntervalRef = useRef(null);
  const [connectionAttempts, setConnectionAttempts] = useState(0);
  const MAX_RECONNECT_ATTEMPTS = 3;
  
  // Token expiry states - HANYA untuk UI countdown warning
  const [tokenExpired, setTokenExpired] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(null);


  // Function to calculate time remaining - HANYA untuk countdown UI, BUKAN untuk blocking
  const calculateTimeRemaining = useCallback((orderData) => {
    const completedStatuses = ['completed', 'delivered', 'picked_up'];
    if (!completedStatuses.includes(orderData.status)) {
      return null; // Order belum selesai, tidak perlu countdown
    }

    const completionTime = orderData.completed_at || orderData.updated_at;
    
    if (!completionTime) {
      return null;
    }

    const completedAt = new Date(completionTime);
    const now = new Date();
    const fiveMinutesInMs = 5 * 60 * 1000;
    const timeElapsed = now - completedAt;
    const timeLeft = fiveMinutesInMs - timeElapsed;

    // Return time left in seconds (bisa negatif jika sudah expired)
    return timeLeft > 0 ? Math.ceil(timeLeft / 1000) : 0;
  }, []);

  const disconnectWebSocket = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    setWsConnected(false);
    setConnectionAttempts(0);
  }, []);

  // Stop polling function
  const stopPolling = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearTimeout(pollingIntervalRef.current); // Use clearTimeout for setTimeout
      pollingIntervalRef.current = null;
    }
  }, []);

  // Smart polling with adaptive intervals based on order status
  const getPollingInterval = (orderStatus) => {
    switch(orderStatus) {
      case 'pending':
      case 'confirmed':
        return 30000; // 30 seconds - payment verification stage
      case 'preparing':
        return 45000; // 45 seconds - cooking stage
      case 'ready':
      case 'delivering':
        return 20000; // 20 seconds - critical delivery stage
      case 'waiting_pickup':
        return 60000; // 1 minute - waiting for pickup
      default:
        return 60000; // 1 minute - default/completed
    }
  };

  // Polling fallback with smart intervals
  const startPolling = useCallback((orderNumber, trackingToken) => {
    // Stop if already polling
    if (pollingIntervalRef.current) {
      return;
    }

    const pollData = async () => {
      if (!tokenExpired) {
        try {
          const response = await publicAPI.getOrder(orderNumber, trackingToken);
          const orderData = response.data;

          let currentOrder = null;
          if (orderData.order) {
            currentOrder = {
              ...orderData.order,
              payment: orderData.last_payment
            };
          } else {
            currentOrder = orderData;
          }

          // Only update if status actually changed or first poll
          const statusChanged = !order || order.status !== currentOrder.status;
          if (statusChanged || !order) {
            setOrder(currentOrder);
            setLastUpdated(new Date());
          }

          // Check if completed and stop polling
          const completedStatuses = ['completed', 'delivered', 'picked_up', 'canceled', 'cancelled'];
          if (completedStatuses.includes(currentOrder.status)) {
            stopPolling();
            disconnectWebSocket();
            return;
          }

          // Schedule next poll with adaptive interval
          const newInterval = getPollingInterval(currentOrder.status);
          
          pollingIntervalRef.current = setTimeout(() => {
            pollingIntervalRef.current = null; // Clear reference
            pollData(); // Recursive call with new timing
          }, newInterval);

        } catch (error) {
          // Retry with longer interval on error
          pollingIntervalRef.current = setTimeout(() => {
            pollingIntervalRef.current = null;
            pollData();
          }, 30000); // 30s retry
        }
      } else {
        stopPolling();
      }
    };

    // Start immediately
    pollData();
  }, [tokenExpired, disconnectWebSocket, stopPolling, order]);

  // Simple WebSocket connection
  const connectToWebSocket = useCallback((orderNumber, trackingToken) => {
    if (!orderNumber || !trackingToken || wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    try {
      // Clean up existing connection
      if (wsRef.current) {
        wsRef.current.close();
      }
      
      const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsHost = process.env.REACT_APP_WS_HOST || window.location.host.replace('3000', '3001');
      const wsUrl = `${wsProtocol}//${wsHost}/ws/order-tracking?order=${orderNumber}&token=${trackingToken}`;
      
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setWsConnected(true);
        setConnectionAttempts(0);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (data.type === 'order_update' && data.order) {
            // Real-time update from admin panel!
            const updatedOrder = {
              ...data.order,
              payment: data.order.payment || order?.payment
            };
            
            setOrder(updatedOrder);
            setLastUpdated(new Date());
            
            // Update time remaining if completed
            const timeLeft = calculateTimeRemaining(updatedOrder);
            setTimeRemaining(timeLeft);
            
            // Stop connections if order completed
            const finalStatuses = ['completed', 'delivered', 'picked_up', 'canceled', 'cancelled'];
            if (finalStatuses.includes(updatedOrder.status)) {
              disconnectWebSocket();
              stopPolling();
            }
          }
        } catch (err) {
          // Ignore malformed payloads from the socket
        }
      };

      ws.onclose = () => {
        setWsConnected(false);
        wsRef.current = null;
        
        // Auto-reconnect for real-time updates (dengan delay lebih lama)
        if (!tokenExpired && connectionAttempts < MAX_RECONNECT_ATTEMPTS) {
          const delay = Math.min(5000 * (connectionAttempts + 1), 30000); // Max 30s
          
          reconnectTimeoutRef.current = setTimeout(() => {
            setConnectionAttempts(prev => prev + 1);
            connectToWebSocket(orderNumber, trackingToken);
          }, delay);
        } else {
          // Fallback to smart polling if WebSocket fails permanently
          if (order && !['completed', 'delivered', 'picked_up', 'canceled', 'cancelled'].includes(order.status)) {
            startPolling(orderNumber, trackingToken);
          }
        }
      };

      ws.onerror = () => {
        setWsConnected(false);
      };
      
    } catch (err) {
      setWsConnected(false);
    }
  }, [calculateTimeRemaining, disconnectWebSocket, stopPolling, connectionAttempts, order, tokenExpired, startPolling]);

  // Format remaining time to display
  const formatTimeRemaining = (seconds) => {
    if (seconds <= 0) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnectWebSocket();
      stopPolling();
    };
  }, [disconnectWebSocket, stopPolling]);

  // Start smart real-time connection after order is loaded
  useEffect(() => {
    if (order && orderNo && token && !tokenExpired) {
      const finalStatuses = ['completed', 'delivered', 'picked_up', 'canceled', 'cancelled'];
      
      if (!finalStatuses.includes(order.status)) {
        // Try WebSocket first for instant updates
        connectToWebSocket(orderNo, token);
        
        // Fallback to smart polling if WebSocket doesn't connect within 5 seconds
        const fallbackTimer = setTimeout(() => {
          if (!wsConnected) {
            startPolling(orderNo, token);
          }
        }, 5000);
        
        return () => clearTimeout(fallbackTimer);
      }
    }
  }, [order, orderNo, token, tokenExpired, connectToWebSocket, startPolling, wsConnected]);

  // Countdown timer - hanya untuk UI warning
  useEffect(() => {
    if (!order || tokenExpired || timeRemaining === null || timeRemaining <= 0) {
      return;
    }

    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          // Countdown selesai, refresh data
          if (orderNo && token) {
            publicAPI.getOrder(orderNo, token).then(response => {
              const orderData = response.data;
              let currentOrder = null;
              if (orderData.order) {
                currentOrder = {
                  ...orderData.order,
                  payment: orderData.last_payment
                };
              } else {
                currentOrder = orderData;
              }
              setOrder(currentOrder);
              setLastUpdated(new Date());
            }).catch(() => {});
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [order, tokenExpired, timeRemaining, orderNo, token]);

  useEffect(() => {
    const urlOrderNo = searchParams.get('order');
    const urlToken = searchParams.get('token');

    if (urlOrderNo && urlToken) {
      setOrderNo(urlOrderNo);
      setToken(urlToken);
      
      // Initial fetch without dependencies to avoid circular reference
      const initialFetch = async () => {
        setLoading(true);
        try {
          const response = await publicAPI.getOrder(urlOrderNo, urlToken);
          const orderData = response.data;

          let currentOrder = null;
          if (orderData.order) {
            currentOrder = {
              ...orderData.order,
              payment: orderData.last_payment
            };
          } else {
            currentOrder = orderData;
          }

          setOrder(currentOrder);
          setLastUpdated(new Date());
          setError('');
          
          // Calculate time remaining
          const timeLeft = calculateTimeRemaining(currentOrder);
          setTimeRemaining(timeLeft);
          
          // Start real-time updates for active orders
          const completedStatuses = ['completed', 'delivered', 'picked_up', 'canceled', 'cancelled'];
          if (!completedStatuses.includes(currentOrder.status)) {
            // Will be handled by the useEffect above
          }
        } catch (error) {
          setError('Gagal memuat pesanan. Silakan coba lagi.');
        } finally {
          setLoading(false);
        }
      };
      
      initialFetch();
    }
  }, [searchParams, calculateTimeRemaining]);

  const handleSearch = async (e) => {
    e.preventDefault();
    setTokenExpired(false);
    setTimeRemaining(null);
    setError('');
    disconnectWebSocket();
    stopPolling();
    
    if (orderNo && token) {
      setLoading(true);
      try {
        const response = await publicAPI.getOrder(orderNo, token);
        const orderData = response.data;

        let currentOrder = null;
        if (orderData.order) {
          currentOrder = {
            ...orderData.order,
            payment: orderData.last_payment
          };
        } else {
          currentOrder = orderData;
        }

        setOrder(currentOrder);
        setLastUpdated(new Date());
        setError('');
        
        // Calculate time remaining
        const timeLeft = calculateTimeRemaining(currentOrder);
        setTimeRemaining(timeLeft);
        
        // Start polling if not completed
        const completedStatuses = ['completed', 'delivered', 'picked_up'];
        if (!completedStatuses.includes(currentOrder.status)) {
          startPolling(orderNo, token);
        }
      } catch (error) {
        setError('Pesanan tidak ditemukan. Periksa kembali nomor pesanan dan token Anda.');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleManualRefresh = async () => {
    if (!tokenExpired && orderNo && token) {
      setLoading(true);
      try {
        const response = await publicAPI.getOrder(orderNo, token);
        const orderData = response.data;

        let currentOrder = null;
        if (orderData.order) {
          currentOrder = {
            ...orderData.order,
            payment: orderData.last_payment
          };
        } else {
          currentOrder = orderData;
        }

        setOrder(currentOrder);
        setLastUpdated(new Date());
        setError('');
        
        // Calculate time remaining
        const timeLeft = calculateTimeRemaining(currentOrder);
        setTimeRemaining(timeLeft);
      } catch (error) {
        setError('Gagal memperbarui pesanan. Silakan coba lagi.');
      } finally {
        setLoading(false);
      }
    }
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
    } catch (err) {
      return '-';
    }
  };

  const formatTime = (date) => {
    if (!date) return '-';
    return date.toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const getWhatsAppLink = (orderNumber, customerName) => {
    const waNumber = process.env.REACT_APP_WHATSAPP_NUMBER || '6282324975131';
    const message = 'Halo Kak, Mau Menanyakan Tentang Pesanan Saya\n\nOrder ID: ' + orderNumber + '\nNama: ' + customerName;
    return 'https://wa.me/' + waNumber + '?text=' + encodeURIComponent(message);
  };

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

  const getDineInTimeline = (paymentMethod) => {
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
        label: 'Pesanan Anda Sudah Siap',
        icon: '✓',
        description: 'Pesanan Anda sudah siap untuk disajikan'
      },
      {
        status: 'waiting_pickup',
        label: 'Menunggu Untuk Disajikan',
        icon: '🍽️',
        description: 'Pesanan menunggu untuk disajikan ke meja Anda'
      },
      {
        status: 'picked_up',
        label: 'Pesanan Sudah Disajikan',
        icon: '✓',
        description: 'Pesanan telah disajikan ke meja Anda'
      },
      {
        status: 'completed',
        label: 'Terselesaikan',
        icon: '🎉',
        description: 'Pesanan selesai. Selamat menikmati!'
      }
    ];
  };

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
        label: 'Pesanan Anda Sudah Siap',
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

  const getTimeline = (orderType, paymentMethod, orderStatus) => {
    if (orderStatus === 'canceled' || orderStatus === 'cancelled' || orderStatus === 'rejected') {
      return getRejectedTimeline(paymentMethod);
    }
    
    if (orderType === 'delivery') {
      return getDeliveryTimeline(paymentMethod);
    } else if (orderType === 'dine_in') {
      return getDineInTimeline(paymentMethod);
    } else {
      return getPickupTimeline(paymentMethod);
    }
  };

  const mapStatusToTimeline = (backendStatus, orderType) => {
    if (backendStatus === 'canceled' || backendStatus === 'cancelled' || backendStatus === 'rejected') {
      return 'canceled';
    }

    if (orderType === 'delivery') {
      const deliveryMap = {
        'pending': 'pending',
        'confirmed': 'confirmed',
        'preparing': 'preparing',
        'ready': 'ready',
        'delivering': 'delivering',
        'delivered': 'delivered',
        'completed': 'completed'
      };
      return deliveryMap[backendStatus] || backendStatus;
    }
    
    const pickupMap = {
      'pending': 'pending',
      'confirmed': 'confirmed',
      'preparing': 'preparing',
      'ready': 'ready',
      'waiting_pickup': 'waiting_pickup',
      'picked_up': 'picked_up',
      'completed': 'completed'
    };
    return pickupMap[backendStatus] || backendStatus;
  };

  const getCurrentStepIndex = (currentStatus, timeline) => {
    const index = timeline.findIndex(step => step.status === currentStatus);
    return index === -1 ? 0 : index;
  };

  // Timeline component
  const TimelineSection = () => {
    if (!order) return null;

    const paymentMethod = order.payment?.method || order.payment_method;
    const timeline = getTimeline(order.type, paymentMethod, order.status);
    const currentStatus = mapStatusToTimeline(order.status, order.type);
    const currentIndex = getCurrentStepIndex(currentStatus, timeline);
    const isRejected = order.status === 'canceled' || order.status === 'cancelled' || order.status === 'rejected';
    const progressWidth = (currentIndex / (timeline.length - 1)) * 100;

    return (
      <div className="p-6">
        {/* Desktop Timeline */}
        <div className="hidden md:block">
          <div className="relative">
            {/* Progress Bar Background */}
            <div className="absolute top-6 left-0 right-0 h-1 bg-gray-200 rounded-full"></div>
            {/* Progress Bar Fill */}
            <div 
              className={'absolute top-6 left-0 h-1 rounded-full transition-all duration-500 ease-out ' + (isRejected ? 'bg-gradient-to-r from-red-500 to-red-600' : 'bg-gradient-to-r from-primary-500 to-primary-600')}
              style={{ width: progressWidth + '%' }}
            ></div>
            
            {/* Timeline Steps */}
            <div className="relative flex justify-between">
              {timeline.map((step, index) => {
                const isCompleted = index <= currentIndex;
                const isCurrent = index === currentIndex;
                const isRejectedStep = isRejected && step.status === 'canceled';
                const stepWidth = 100 / timeline.length;

                let iconContainerClass = 'relative z-10 flex items-center justify-center w-12 h-12 rounded-full border-4 transition-all duration-300 ';
                if (isRejectedStep) {
                  iconContainerClass += 'bg-red-500 border-white shadow-lg scale-110';
                } else if (isCompleted) {
                  if (isCurrent) {
                    iconContainerClass += 'bg-primary-600 border-white shadow-lg scale-110 animate-pulse';
                  } else {
                    iconContainerClass += 'bg-primary-600 border-white shadow-md';
                  }
                } else {
                  iconContainerClass += 'bg-white border-gray-300';
                }

                let labelClass = 'text-xs sm:text-sm font-semibold mb-1 leading-tight ';
                if (isRejectedStep) {
                  labelClass += 'text-red-600';
                } else if (isCurrent) {
                  labelClass += 'text-primary-600';
                } else if (isCompleted) {
                  labelClass += 'text-gray-900';
                } else {
                  labelClass += 'text-gray-400';
                }

                return (
                  <div key={step.status} className="flex flex-col items-center" style={{ width: stepWidth + '%' }}>
                    <div className={iconContainerClass}>
                      <span className={(isCompleted || isRejectedStep) ? 'text-xl filter brightness-0 invert' : 'text-xl opacity-50'}>
                        {step.icon}
                      </span>
                    </div>
                    <div className="mt-3 text-center px-2">
                      <p className={labelClass}>{step.label}</p>
                      {isCurrent && !isRejected && (
                        <span className="inline-block px-2 py-0.5 bg-primary-100 text-primary-700 text-xs rounded-full font-medium">
                          Saat Ini
                        </span>
                      )}
                      {isCompleted && !isCurrent && (
                        <span className="inline-block text-green-600 text-xs font-medium">✓ Selesai</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Current Step Description */}
          <div className={'mt-8 p-4 rounded-lg border ' + (isRejected ? 'bg-red-50 border-red-200' : 'bg-primary-50 border-primary-200')}>
            <p className="text-sm text-gray-700">
              <span className={'font-semibold ' + (isRejected ? 'text-red-700' : 'text-primary-700')}>
                Status saat ini:
              </span>{' '}
              {timeline[currentIndex]?.description}
            </p>
          </div>
        </div>

        {/* Mobile Timeline */}
        <div className="md:hidden">
          <div className={'rounded-xl p-4 border ' + (isRejected ? 'bg-red-50 border-red-200' : 'bg-primary-50 border-primary-200')}>
            <div className="flex items-center gap-3">
              <div className={'flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center ' + (isRejected ? 'bg-red-500' : 'bg-primary-600')}>
                <span className="text-xl filter brightness-0 invert">
                  {timeline[currentIndex]?.icon}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className={'text-xs font-medium ' + (isRejected ? 'text-red-600' : 'text-primary-600')}>
                  {isRejected ? 'DIBATALKAN' : 'Step ' + (currentIndex + 1) + '/' + timeline.length}
                </p>
                <p className="font-bold text-gray-900 truncate">
                  {timeline[currentIndex]?.label}
                </p>
              </div>
              {!isRejected && (
                <div className="flex-shrink-0 text-right">
                  <span className="text-lg font-bold text-primary-600">
                    {Math.round(((currentIndex + 1) / timeline.length) * 100)}%
                  </span>
                </div>
              )}
            </div>
            <p className="text-xs text-gray-600 mt-2">
              {timeline[currentIndex]?.description}
            </p>
          </div>
        </div>
      </div>
    );
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
          <div className={tokenExpired ? 'bg-orange-50 border-l-4 border-orange-400 p-4 mb-6 rounded' : 'bg-red-50 border-l-4 border-red-400 p-4 mb-6 rounded'}>
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className={'h-5 w-5 ' + (tokenExpired ? 'text-orange-400' : 'text-red-400')} fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className={'text-sm whitespace-pre-line ' + (tokenExpired ? 'text-orange-700' : 'text-red-700')}>{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Order Details */}
        {order && !tokenExpired && (
          <div className="space-y-6">
            {/* Token Expiry Warning - Show for completed orders */}
            {timeRemaining !== null && timeRemaining > 0 && (
              <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3 flex-1">
                    <p className="text-sm text-yellow-700">
                      <span className="font-semibold">Perhatian:</span> Token tracking akan kedaluwarsa dalam{' '}
                      <span className="font-bold text-yellow-900">{formatTimeRemaining(timeRemaining)}</span>
                      {' '}untuk alasan keamanan.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Success Banner for Completed Orders */}
            {(order.status === 'completed' || order.status === 'delivered' || order.status === 'picked_up') && (
              <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center">
                <div className="flex justify-center mb-3">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                    <span className="text-3xl">✅</span>
                  </div>
                </div>
                <h3 className="text-lg font-bold text-green-800 mb-2">Pesanan Anda Sudah Selesai!</h3>
                <p className="text-sm text-green-700">
                  Terima kasih telah memesan di Kedai Yuru! 🙏
                </p>
              </div>
            )}

            {/* Auto-Refresh Status Bar */}
            <div className="bg-white rounded-xl shadow-md p-4">
              <div className="flex items-center justify-between">
                {/* Live indicator */}
                <div className="flex items-center gap-2">
                  {tokenExpired ? (
                    <>
                      <span className="relative flex h-2 w-2">
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500"></span>
                      </span>
                      <span className="text-sm text-orange-600 font-medium">Token Expired</span>
                      <span className="text-xs text-gray-500">• WebSocket dinonaktifkan</span>
                    </>
                  ) : order && (order.status === 'completed' || order.status === 'delivered' || order.status === 'picked_up') ? (
                    <>
                      <span className="relative flex h-2 w-2">
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                      </span>
                      <span className="text-sm text-green-600 font-medium">Selesai</span>
                      <span className="text-xs text-gray-500">• Pesanan telah selesai</span>
                    </>
                  ) : wsConnected ? (
                    <>
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                      </span>
                      <span className="text-sm text-green-600 font-medium">🚀 Real-time</span>
                      <span className="text-xs text-gray-500">• Update otomatis dari admin</span>
                    </>
                  ) : pollingIntervalRef.current ? (
                    <>
                      <span className="relative flex h-2 w-2">
                        <span className="animate-pulse absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                      </span>
                      <span className="text-sm text-blue-600 font-medium">🧠 Smart polling</span>
                      <span className="text-xs text-gray-500">• Update adaptif berdasarkan status</span>
                    </>
                  ) : (
                    <>
                      <span className="relative flex h-2 w-2">
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-gray-400"></span>
                      </span>
                      <span className="text-sm text-gray-500 font-medium">Manual refresh</span>
                      <span className="text-xs text-gray-500">• Klik tombol refresh untuk update</span>
                    </>
                  )}
                </div>

                {/* Right side: last updated & refresh button */}
                <div className="flex items-center gap-3">
                  {lastUpdated && (
                    <span className="text-xs text-gray-500">
                      {formatTime(lastUpdated)}
                    </span>
                  )}
                  <button
                    onClick={handleManualRefresh}
                    disabled={loading || tokenExpired || ['completed', 'delivered', 'picked_up', 'canceled', 'cancelled'].includes(order?.status)}
                    className={'inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ' + ((loading || tokenExpired || ['completed', 'delivered', 'picked_up', 'canceled', 'cancelled'].includes(order?.status)) ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-primary-100 text-primary-700 hover:bg-primary-200')}
                  >
                    <svg
                      className={'w-4 h-4 mr-1.5 ' + (loading ? 'animate-spin' : '')}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                      />
                    </svg>
                    {loading ? 'Memuat...' : tokenExpired ? 'Token Expired' : ['completed', 'delivered', 'picked_up'].includes(order?.status) ? 'Selesai' : 'Refresh'}
                  </button>
                </div>
              </div>
            </div>

            {/* Order Info Card */}
            <div className="bg-white rounded-xl shadow-md p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">{order.order_no}</h3>
                  <p className="text-sm text-gray-600">{formatDate(order.created_at)}</p>
                </div>
                <span className={'px-4 py-2 rounded-full text-sm font-medium ' + (order.type === 'delivery' ? 'bg-blue-100 text-blue-800' : order.type === 'dine_in' ? 'bg-purple-100 text-purple-800' : 'bg-green-100 text-green-800')}>
                  {order.type === 'delivery' ? '🚗 Delivery' : order.type === 'dine_in' ? '🍽️ Dine-in' : '🏪 Pickup'}
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
                  <span className={'inline-block px-2 py-1 rounded text-xs font-medium ' + (order.payment?.status === 'verified' ? 'bg-green-100 text-green-800' : order.payment?.status === 'rejected' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800')}>
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

            {/* Timeline Card */}
            <div className="bg-gradient-to-br from-white to-gray-50 rounded-xl shadow-lg overflow-hidden">
              <div className="bg-gradient-to-r from-primary-600 to-primary-700 px-6 py-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold text-white flex items-center">
                    <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Status Pesanan
                  </h3>
                  {!wsConnected && (
                    <div className="flex items-center gap-2 text-white text-sm" style={{ opacity: 0.8 }}>
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Menghubungkan...
                    </div>
                  )}
                </div>
              </div>
              <TimelineSection />
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
                              {mod.price_delta > 0 && ' (+' + formatRupiah(mod.price_delta) + ')'}
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
              
              {/* Summary */}
              <div className="border-t pt-3 mt-3 space-y-2">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-600">Subtotal</span>
                  <span className="text-gray-900">
                    {formatRupiah(order.items?.reduce((sum, item) => sum + Number(item.subtotal || 0), 0) || 0)}
                  </span>
                </div>
                
                {order.discount_amount > 0 && (
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-green-600 flex items-center">
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                      </svg>
                      Diskon {order.discount_code ? '(' + order.discount_code + ')' : ''}
                    </span>
                    <span className="text-green-600 font-medium">-{formatRupiah(order.discount_amount)}</span>
                  </div>
                )}
                
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
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
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