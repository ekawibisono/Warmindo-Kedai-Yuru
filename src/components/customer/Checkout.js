import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { publicAPI } from '../../services/api';

// QRIS Payment Data from environment variable
const QRIS_DATA = process.env.REACT_APP_QRIS_DATA || '';

const Checkout = ({ cart, onClose, onSuccess, isDeliveryDisabled = false }) => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1); // 1: Form, 2: Payment Method, 3: Upload Proof
  const [loading, setLoading] = useState(false);
  const [orderData, setOrderData] = useState(null);

  const [customerInfo, setCustomerInfo] = useState({
    customer_name: '',
    customer_phone: '',
    notes: '',
    delivery_address: '',
  });

  // Default to pickup if delivery is disabled
  const [orderType, setOrderType] = useState(isDeliveryDisabled ? 'pickup' : 'pickup');
  const [paymentMethod, setPaymentMethod] = useState('qris');
  const [proofFile, setProofFile] = useState(null);
  const [proofPreview, setProofPreview] = useState(null);

  // Discount states (NEW)
  const [discountCode, setDiscountCode] = useState('');
  const [discountLoading, setDiscountLoading] = useState(false);
  const [appliedDiscount, setAppliedDiscount] = useState(null);
  const [discountError, setDiscountError] = useState('');

  const getSubtotal = () => {
    return cart.reduce((sum, item) => sum + item.subtotal, 0);
  };

  const getDiscountAmount = () => {
    return appliedDiscount ? appliedDiscount.discount_amount : 0;
  };

  // FIX: Ensure total is never negative
  const getTotalAmount = () => {
    const subtotal = getSubtotal();
    const discount = getDiscountAmount();
    const total = subtotal - discount;
    
    // Return 0 if negative (100% discount or more)
    return Math.max(0, total);
  };

  // FIX: Check if order is free (100% discount)
  const isFreeOrder = () => {
    return getTotalAmount() === 0;
  };

  // Check if delivery should be disabled (100% discount or disabled by store)
  const isDeliveryNotAvailable = () => {
    return isDeliveryDisabled || isFreeOrder();
  };

  const formatRupiah = (number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(number);
  };

  // Validate discount code (NEW)
  const handleApplyDiscount = async () => {
    if (!discountCode.trim()) {
      setDiscountError('Masukkan kode promo');
      return;
    }

    setDiscountLoading(true);
    setDiscountError('');

    try {
      const items = cart.map(item => ({
        product_id: item.product_id || item.id,
        category_id: item.category_id || null,
        price: Number(item.price),
        subtotal: Number(item.subtotal),
        quantity: Number(item.quantity)
      }));
      
      const response = await publicAPI.validateDiscount(discountCode, getSubtotal(), items);
      
      if (response.data.valid) {
        setAppliedDiscount(response.data.discount);
        setDiscountError('');
        
        // FIX: Auto-select cash for 100% discount and disable delivery
        const discountAmount = response.data.discount.discount_amount;
        if (discountAmount >= getSubtotal()) {
          setPaymentMethod('cash');
          setOrderType('pickup'); // Force pickup for 100% discount
        }
      } else {
        setDiscountError(response.data.error || 'Kode promo tidak valid');
        setAppliedDiscount(null);
      }
    } catch (error) {
      const errorMessage = error.response?.data?.error || 
                          error.response?.data?.message || 
                          'Gagal memvalidasi kode promo';
      
      setDiscountError(errorMessage);
      setAppliedDiscount(null);
    } finally {
      setDiscountLoading(false);
    }
  };

  // Remove applied discount (NEW)
  const handleRemoveDiscount = () => {
    setAppliedDiscount(null);
    setDiscountCode('');
    setDiscountError('');
    // Reset to QRIS and re-enable delivery options
    setPaymentMethod('qris');
    if (!isDeliveryDisabled) {
      setOrderType('pickup'); // Reset to default but allow selection
    }
  };

  const handleCustomerInfoSubmit = (e) => {
    e.preventDefault();
    setStep(2);
  };

  const handleCreateOrder = async () => {
    // FIX: Prevent QRIS for free orders
    if (isFreeOrder() && paymentMethod === 'qris') {
      alert('❌ Pesanan gratis tidak dapat menggunakan QRIS.\nSilakan pilih metode Cash.');
      return;
    }

    // Validation for delivery address
    if (orderType === 'delivery' && !customerInfo.delivery_address.trim()) {
      alert('❌ Alamat lengkap wajib diisi untuk pesanan delivery.');
      return;
    }

    // Prevent delivery for 100% discount orders
    if (orderType === 'delivery' && appliedDiscount && (appliedDiscount.discount_percentage === 100 || appliedDiscount.discount_amount >= getSubtotal())) {
      alert('❌ Pesanan gratis harus menggunakan pickup. Delivery tidak tersedia untuk diskon 100%.');
      return;
    }

    setLoading(true);

    try {
      // Prepare order items
      const items = cart.map(item => ({
        product_id: item.product_id,
        qty: item.quantity,
        modifiers: item.modifiers.map(mod => ({
          modifier_id: mod.id,
          qty: 1
        }))
      }));

      const orderPayload = {
        type: orderType,
        payment_method: paymentMethod,
        customer_name: customerInfo.customer_name,
        customer_phone: customerInfo.customer_phone,
        delivery_address: orderType === 'delivery' ? customerInfo.delivery_address : null,
        items: items,
        notes: customerInfo.notes || null,
        // Include discount if applied (NEW)
        discount_code: appliedDiscount ? appliedDiscount.code : null,
        discount_id: appliedDiscount ? appliedDiscount.id : null,
        discount_amount: appliedDiscount ? appliedDiscount.discount_amount : 0
      };

      const response = await publicAPI.createOrder(orderPayload);

      const orderData = {
        order: {
          order_no: response.data.order_no,
          grand_total: response.data.grand_total,
          status: response.data.status
        },
        tracking_token: response.data.tracking_token
      };

      setOrderData(orderData);

      // FIX: Skip QRIS upload step for free orders or cash payment
      if (paymentMethod === 'qris' && !isFreeOrder()) {
        setStep(3);
      } else {
        const orderNo = orderData.order.order_no;
        const token = orderData.tracking_token;

        onSuccess(orderData);
        navigate(`/track?order=${orderNo}&token=${token}`);
      }
    } catch (error) {
      console.error('❌ Error creating order:', error);
      alert('Gagal membuat pesanan: ' + (error.response?.data?.error || error.message));
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "application/pdf"
    ];
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (!allowedTypes.includes(file.type)) {
      alert("File harus berupa JPG, PNG, atau PDF");
      e.target.value = "";
      return;
    }
    if (file.size > maxSize) {
      alert("Ukuran file maksimal 5MB");
      e.target.value = "";
      return;
    }
    setProofFile(file);
    // Preview hanya untuk IMAGE
    if (file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setProofPreview(reader.result);
      };
      reader.readAsDataURL(file);
    } else {
      setProofPreview(null); // PDF tidak dipreview sebagai image
    }
  };

  const handleUploadProof = async () => {
    if (!proofFile) {
      alert('Silakan pilih file bukti pembayaran');
      return;
    }

    // FIX: Validate amount
    const totalAmount = getTotalAmount();
    if (totalAmount <= 0) {
      alert('❌ Jumlah pembayaran tidak valid (Rp 0). Tidak dapat upload bukti QRIS.');
      return;
    }

    setLoading(true);

    try {
      await publicAPI.uploadQrisProof(
        orderData.order.order_no,
        orderData.tracking_token,
        proofFile,
        totalAmount
      );

      const orderNo = orderData.order.order_no;
      const token = orderData.tracking_token;

      onSuccess(orderData);
      navigate(`/track?order=${orderNo}&token=${token}&uploaded=true`);

    } catch (error) {
      console.error('❌ Error uploading proof:', error);
      alert('Gagal upload bukti pembayaran: ' + (error.response?.data?.error || error.message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-xl max-w-lg w-full p-6 my-8 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">
            {step === 1 && 'Informasi Pelanggan'}
            {step === 2 && 'Metode Pembayaran'}
            {step === 3 && 'Upload Bukti Pembayaran'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 flex items-center gap-2"
            disabled={loading}
            title="Kembali ke Menu (Pesanan tetap tersimpan)"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Info: Cart is saved */}
        {step < 3 && (
          <div className="mb-4 bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-start">
            <svg className="w-5 h-5 text-blue-600 mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-xs text-blue-800">
              <span className="font-semibold">Pesanan Anda tersimpan!</span> Anda bisa kembali ke menu untuk menambah pesanan lagi.
            </p>
          </div>
        )}

        {/* Progress Steps */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center flex-1">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold ${step >= 1 ? 'bg-primary-600 text-white' : 'bg-gray-300'}`}>
                1
              </div>
              <div className={`flex-1 h-1 mx-2 ${step >= 2 ? 'bg-primary-600' : 'bg-gray-300'}`}></div>
            </div>
            <div className="flex items-center flex-1">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold ${step >= 2 ? 'bg-primary-600 text-white' : 'bg-gray-300'}`}>
                2
              </div>
              <div className={`flex-1 h-1 mx-2 ${step >= 3 ? 'bg-primary-600' : 'bg-gray-300'}`}></div>
            </div>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold ${step >= 3 ? 'bg-primary-600 text-white' : 'bg-gray-300'}`}>
              3
            </div>
          </div>
        </div>

        {/* Step 1: Customer Info */}
        {step === 1 && (
          <form onSubmit={handleCustomerInfoSubmit}>
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nama <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={customerInfo.customer_name}
                  onChange={(e) => setCustomerInfo({ ...customerInfo, customer_name: e.target.value })}
                  className="input-field"
                  placeholder="Nama Anda"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nomor WhatsApp <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  value={customerInfo.customer_phone}
                  onChange={(e) => setCustomerInfo({ ...customerInfo, customer_phone: e.target.value })}
                  className="input-field"
                  placeholder="08123456789"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tipe Pesanan <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setOrderType('pickup')}
                    className={`p-3 border-2 rounded-lg text-center transition-colors ${
                      orderType === 'pickup'
                        ? 'border-primary-500 bg-primary-50 text-primary-700'
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    <div className="font-bold">🏪 Pickup</div>
                    <div className="text-xs text-gray-600 mt-1">Ambil di toko</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setOrderType('delivery')}
                    disabled={isDeliveryNotAvailable()}
                    className={`p-3 border-2 rounded-lg text-center transition-colors ${
                      orderType === 'delivery'
                        ? 'border-primary-500 bg-primary-50 text-primary-700'
                        : isDeliveryNotAvailable()
                        ? 'border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed'
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    <div className="font-bold">🚗 Delivery</div>
                    <div className="text-xs text-gray-600 mt-1">
                      {isDeliveryDisabled 
                        ? 'Tidak tersedia' 
                        : isFreeOrder() 
                        ? 'Tidak untuk gratis'
                        : 'Antar ke lokasi'
                      }
                    </div>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Catatan (Opsional)
                </label>
                <textarea
                  value={customerInfo.notes}
                  onChange={(e) => setCustomerInfo({ ...customerInfo, notes: e.target.value })}
                  className="input-field"
                  rows="3"
                  placeholder="Contoh: Pedas sedang, tanpa bawang"
                />
              </div>

              {/* Delivery Address - Show only for delivery */}
              {orderType === 'delivery' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Alamat Lengkap <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={customerInfo.delivery_address}
                    onChange={(e) => setCustomerInfo({ ...customerInfo, delivery_address: e.target.value })}
                    className="input-field"
                    rows="4"
                    placeholder="Contoh: Jl. Wonolopo No. 123, RT 02/RW 07, Kelurahan ABC, Semarang&#10;Patokan: Dekat warung Pak Budi, rumah cat hijau"
                    required={orderType === 'delivery'}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Mohon tulis alamat lengkap dengan patokan yang jelas
                  </p>
                </div>
              )}

              {/* Discount Code Section */}
              <div className="border-t pt-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Kode Promo
                </label>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={discountCode}
                    onChange={(e) => setDiscountCode(e.target.value.toUpperCase())}
                    className="input-field flex-1"
                    placeholder="Masukkan Kode Promo"
                    disabled={appliedDiscount !== null}
                  />
                  {appliedDiscount ? (
                    <button
                      type="button"
                      onClick={handleRemoveDiscount}
                      className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 font-medium"
                    >
                      Hapus
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleApplyDiscount}
                      disabled={discountLoading || !discountCode.trim()}
                      className="px-4 py-2 btn-primary disabled:opacity-50"
                    >
                      {discountLoading ? 'Loading...' : 'Pakai'}
                    </button>
                  )}
                </div>
                {discountError && (
                  <p className="text-red-500 text-sm mt-2">{discountError}</p>
                )}
                {appliedDiscount && (
                  <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-green-700 text-sm font-medium">
                      ✓ {appliedDiscount.name} diterapkan!
                    </p>
                  </div>
                )}
              </div>

              {/* Order Summary */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-bold mb-3">Ringkasan Pesanan</h3>
                <div className="space-y-2 text-sm">
                  {cart.map((item, index) => (
                    <div key={index} className="flex justify-between">
                      <span>
                        {item.quantity}x {item.product_name}
                        {item.modifiers.length > 0 && (
                          <span className="text-gray-600 text-xs ml-1">
                            (+{item.modifiers.map(m => m.name).join(', ')})
                          </span>
                        )}
                      </span>
                      <span>{formatRupiah(item.subtotal)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between pt-2 border-t">
                    <span>Subtotal</span>
                    <span>{formatRupiah(getSubtotal())}</span>
                  </div>
                  {appliedDiscount && (
                    <div className="flex justify-between text-green-600">
                      <span>Diskon ({appliedDiscount.code})</span>
                      <span>-{formatRupiah(getDiscountAmount())}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-lg font-bold pt-2 border-t">
                    <span>Total</span>
                    <span className={isFreeOrder() ? 'text-green-600' : 'text-primary-600'}>
                      {isFreeOrder() ? 'GRATIS 🎉' : formatRupiah(getTotalAmount())}
                    </span>
                  </div>
                  {isFreeOrder() && (
                    <div className="bg-green-100 border border-green-300 rounded p-2 mt-2">
                      <p className="text-green-800 text-xs font-semibold text-center">
                        🎉 Pesanan Gratis! Gunakan metode Cash pada langkah berikutnya
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 btn-secondary"
              >
                Batal
              </button>
              <button
                type="submit"
                className="flex-1 btn-primary"
              >
                Lanjutkan
              </button>
            </div>
          </form>
        )}

        {/* Step 2: Payment Method */}
        {step === 2 && (
          <div className="space-y-6">
            <div>
              <h3 className="font-bold text-lg mb-4">Pilih Metode Pembayaran</h3>

              <div className="space-y-3">
                {/* QRIS Option - Disabled for free orders */}
                <label className={`flex items-center p-4 border-2 rounded-lg transition-colors ${
                  isFreeOrder() 
                    ? 'border-gray-200 bg-gray-50 cursor-not-allowed opacity-60' 
                    : paymentMethod === 'qris'
                    ? 'border-primary-500 bg-primary-50 cursor-pointer'
                    : 'border-gray-300 hover:bg-gray-50 cursor-pointer'
                }`}>
                  <input
                    type="radio"
                    name="payment_method"
                    value="qris"
                    checked={paymentMethod === 'qris'}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    disabled={isFreeOrder()}
                    className="mr-4"
                  />
                  <div className="flex-1">
                    <div className="flex items-center">
                      <svg className="w-8 h-8 text-primary-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                      </svg>
                      <div>
                        <p className="font-bold">QRIS</p>
                        <p className="text-sm text-gray-600">
                          {isFreeOrder() ? '❌ Tidak tersedia untuk pesanan gratis' : 'Scan QR Code & Upload Bukti'}
                        </p>
                      </div>
                    </div>
                  </div>
                </label>

                {/* Cash Option */}
                <label className={`flex items-center p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                  paymentMethod === 'cash'
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-gray-300 hover:bg-gray-50'
                }`}>
                  <input
                    type="radio"
                    name="payment_method"
                    value="cash"
                    checked={paymentMethod === 'cash'}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="mr-4"
                  />
                  <div className="flex-1">
                    <div className="flex items-center">
                      <svg className="w-8 h-8 text-green-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                      <div>
                        <p className="font-bold">Bayar Cash {isFreeOrder() && '✅'}</p>
                        <p className="text-sm text-gray-600">
                          {isFreeOrder() ? '🎉 Gratis - Langsung Ambil' : 'Bayar langsung / Bisa Di kasir'}
                        </p>
                      </div>
                    </div>
                  </div>
                </label>
              </div>
            </div>

            {/* Payment Summary with Discount */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span>{formatRupiah(getSubtotal())}</span>
                </div>
                {appliedDiscount && (
                  <div className="flex justify-between text-green-600">
                    <span>Diskon ({appliedDiscount.code})</span>
                    <span>-{formatRupiah(getDiscountAmount())}</span>
                  </div>
                )}
              </div>
              <div className="flex justify-between text-lg font-bold pt-2 mt-2 border-t">
                <span>Total Pembayaran:</span>
                <span className={isFreeOrder() ? 'text-green-600' : 'text-primary-600'}>
                  {isFreeOrder() ? 'GRATIS 🎉' : formatRupiah(getTotalAmount())}
                </span>
              </div>
            </div>

            <div className="flex space-x-3">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="flex-1 btn-secondary"
                disabled={loading}
              >
                Kembali
              </button>
              <button
                type="button"
                onClick={handleCreateOrder}
                className="flex-1 btn-primary"
                disabled={loading}
              >
                {loading ? 'Memproses...' : 'Buat Pesanan'}
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Upload Proof */}
        {step === 3 && orderData && (
          <div className="space-y-6">
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <div className="flex items-start">
                <svg className="w-5 h-5 text-green-600 mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <p className="font-bold text-green-900 text-sm">Pesanan Berhasil Dibuat!</p>
                  <p className="text-xs text-green-800 mt-1">
                    Nomor Pesanan: <span className="font-bold">{orderData.order.order_no}</span>
                  </p>
                  <p className="text-xs text-green-800">
                    Token: <span className="font-mono text-xs">{orderData.tracking_token}</span>
                  </p>
                </div>
              </div>
            </div>

            <div className="border-2 border-dashed border-primary-300 rounded-lg p-4 text-center">
              <h3 className="font-bold text-lg mb-2">Scan QRIS Code</h3>
              <p className="text-gray-600 text-sm mb-3">Scan kode QR dengan aplikasi banking Anda</p>
              <p className="text-xl font-bold text-primary-600 mb-3">{formatRupiah(getTotalAmount())}</p>

              {/* QR Code */}
              <div className="bg-white p-4 rounded-lg inline-block shadow-md mb-3">
                <QRCodeSVG 
                  value={QRIS_DATA}
                  size={200}
                  level="M"
                  includeMargin={true}
                />
              </div>
              
              <p className="text-xs text-gray-500">QRIS - Kedai Yuru</p>
            </div>

            <div>
              <h3 className="font-bold mb-2 text-sm">Upload Bukti Pembayaran</h3>

              <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                {proofPreview ? (
                  <div>
                    <img
                      src={proofPreview}
                      alt="Preview"
                      className="max-h-48 mx-auto mb-3 rounded-lg"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setProofFile(null);
                        setProofPreview(null);
                      }}
                      className="text-red-600 hover:text-red-800 text-sm"
                    >
                      Hapus
                    </button>
                  </div>
                ) : (
                  <div>
                    <svg className="w-10 h-10 text-gray-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    <label className="cursor-pointer">
                      <span className="text-primary-600 hover:text-primary-700 font-medium text-sm">
                        Pilih file
                      </span>
                      <input
                        type="file"
                        accept="image/jpeg,image/jpg,image/png,application/pdf"
                        onChange={handleFileChange}
                        className="hidden"
                      />
                    </label>
                    <p className="text-xs text-gray-500 mt-2">
                      JPG, PNG atau PDF (Max 5MB)
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="flex space-x-3">
              <button
                type="button"
                onClick={handleUploadProof}
                className="flex-1 btn-primary"
                disabled={loading || !proofFile}
              >
                {loading ? 'Mengupload...' : 'Upload Bukti'}
              </button>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
              <p className="font-medium mb-1">💡 Tips:</p>
              <ul className="list-disc ml-5 space-y-0.5 text-xs">
                <li>Pastikan bukti pembayaran jelas dan terbaca</li>
                <li>Screenshot harus menampilkan jumlah dan waktu transfer</li>
                <li>Pesanan akan diproses setelah pembayaran diverifikasi</li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Checkout;