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

  const getTotalAmount = () => {
    return getSubtotal() - getDiscountAmount();
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
      const response = await publicAPI.validateDiscount(discountCode, getSubtotal());
      
      if (response.data.valid) {
        setAppliedDiscount(response.data.discount);
        setDiscountError('');
      } else {
        setDiscountError(response.data.error || 'Kode promo tidak valid');
        setAppliedDiscount(null);
      }
    } catch (error) {
      console.error('Error validating discount:', error);
      setDiscountError(error.response?.data?.error || 'Gagal memvalidasi kode promo');
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
  };

  const handleCustomerInfoSubmit = (e) => {
    e.preventDefault();
    setStep(2);
  };

  const handleCreateOrder = async () => {
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

      if (paymentMethod === 'qris') {
        setStep(3);
      } else {
        const orderNo = orderData.order.order_no;
        const token = orderData.tracking_token;

        onSuccess(orderData);
        navigate(`/track?order=${orderNo}&token=${token}`);
      }
    } catch (error) {
      console.error('Error creating order:', error);
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

    setLoading(true);

    try {
      await publicAPI.uploadQrisProof(
        orderData.order.order_no,
        orderData.tracking_token,
        proofFile,
        getTotalAmount()
      );

      const orderNo = orderData.order.order_no;
      const token = orderData.tracking_token;

      onSuccess(orderData);
      navigate(`/track?order=${orderNo}&token=${token}&uploaded=true`);

    } catch (error) {
      console.error('Error uploading proof:', error);
      alert('Gagal upload bukti pembayaran: ' + (error.response?.data?.error || error.message));
    } finally {
      setLoading(false);
    }
  };

  const handleSkipUpload = () => {
    const orderNo = orderData.order.order_no;
    const token = orderData.tracking_token;

    onSuccess(orderData);
    navigate(`/track?order=${orderNo}&token=${token}`);
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
            className="text-gray-400 hover:text-gray-600"
            disabled={loading}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Progress Steps */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center flex-1">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 1 ? 'bg-primary-600 text-white' : 'bg-gray-300'}`}>
                1
              </div>
              <div className={`flex-1 h-1 mx-2 ${step >= 2 ? 'bg-primary-600' : 'bg-gray-300'}`}></div>
            </div>
            <div className="flex items-center flex-1">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 2 ? 'bg-primary-600 text-white' : 'bg-gray-300'}`}>
                2
              </div>
              <div className={`flex-1 h-1 mx-2 ${step >= 3 ? 'bg-primary-600' : 'bg-gray-300'}`}></div>
            </div>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 3 ? 'bg-primary-600 text-white' : 'bg-gray-300'}`}>
              3
            </div>
          </div>
        </div>

        {/* Step 1: Customer Information */}
        {step === 1 && (
          <form onSubmit={handleCustomerInfoSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tipe Pesanan *
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className={`flex items-center justify-center p-4 border-2 rounded-lg cursor-pointer transition-colors ${orderType === 'pickup' ? 'border-primary-600 bg-primary-50' : 'border-gray-300 hover:bg-gray-50'
                  }`}>
                  <input
                    type="radio"
                    name="orderType"
                    value="pickup"
                    checked={orderType === 'pickup'}
                    onChange={(e) => setOrderType(e.target.value)}
                    className="mr-3"
                  />
                  <div className="text-center">
                    <svg className="w-8 h-8 mx-auto mb-2 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                    </svg>
                    <p className="font-bold">Pickup</p>
                    <p className="text-xs text-gray-600">Ambil sendiri</p>
                  </div>
                </label>

                <label className={`relative flex items-center justify-center p-4 border-2 rounded-lg transition-colors ${
                  isDeliveryDisabled 
                    ? 'border-gray-200 bg-gray-100 cursor-not-allowed opacity-60' 
                    : orderType === 'delivery' 
                      ? 'border-primary-600 bg-primary-50 cursor-pointer' 
                      : 'border-gray-300 hover:bg-gray-50 cursor-pointer'
                  }`}>
                  <input
                    type="radio"
                    name="orderType"
                    value="delivery"
                    checked={orderType === 'delivery'}
                    onChange={(e) => !isDeliveryDisabled && setOrderType(e.target.value)}
                    disabled={isDeliveryDisabled}
                    className="mr-3"
                  />
                  <div className="text-center">
                    <svg className={`w-8 h-8 mx-auto mb-2 ${isDeliveryDisabled ? 'text-gray-400' : 'text-primary-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
                    </svg>
                    <p className={`font-bold ${isDeliveryDisabled ? 'text-gray-400' : ''}`}>Delivery</p>
                    <p className={`text-xs ${isDeliveryDisabled ? 'text-gray-400' : 'text-gray-600'}`}>
                      {isDeliveryDisabled ? 'Tidak tersedia' : 'Diantar'}
                    </p>
                  </div>
                  {isDeliveryDisabled && (
                    <div className="absolute -top-2 -right-2 bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                      OFF
                    </div>
                  )}
                </label>
              </div>
              {isDeliveryDisabled && (
                <p className="text-xs text-amber-600 mt-2 flex items-center">
                  <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  Layanan delivery sedang tidak tersedia saat ini
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nama Lengkap *
              </label>
              <input
                type="text"
                required
                value={customerInfo.customer_name}
                onChange={(e) => setCustomerInfo({ ...customerInfo, customer_name: e.target.value })}
                className="input-field"
                placeholder="Masukkan nama lengkap"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nomor Telepon *
              </label>
              <input
                type="tel"
                required
                value={customerInfo.customer_phone}
                onChange={(e) => setCustomerInfo({ ...customerInfo, customer_phone: e.target.value })}
                className="input-field"
                placeholder="08xxxxxxxxxx"
              />
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
                placeholder="Tambahkan catatan untuk pesanan (contoh: tidak pedas, tanpa bawang Dan Alamat)"
              />
            </div>

            {/* Discount Code Input (NEW) */}
            <div className="border-t pt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                🏷️ Kode Promo
              </label>
              {appliedDiscount ? (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <svg className="w-5 h-5 text-green-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <div>
                        <p className="font-bold text-green-800">{appliedDiscount.code}</p>
                        <p className="text-xs text-green-600">{appliedDiscount.name}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-green-600">-{formatRupiah(appliedDiscount.discount_amount)}</p>
                      <button
                        type="button"
                        onClick={handleRemoveDiscount}
                        className="text-xs text-red-600 hover:text-red-800"
                      >
                        Hapus
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={discountCode}
                    onChange={(e) => {
                      setDiscountCode(e.target.value.toUpperCase());
                      setDiscountError('');
                    }}
                    className="input-field flex-1"
                    placeholder="Masukkan kode promo"
                  />
                  <button
                    type="button"
                    onClick={handleApplyDiscount}
                    disabled={discountLoading || !discountCode.trim()}
                    className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                  >
                    {discountLoading ? '...' : 'Pakai'}
                  </button>
                </div>
              )}
              {discountError && (
                <p className="text-xs text-red-600 mt-1 flex items-center">
                  <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  {discountError}
                </p>
              )}
            </div>

            {/* Order Summary */}
            <div className="border-t pt-4 mt-4">
              <h3 className="font-bold mb-3">Ringkasan Pesanan</h3>
              <div className="space-y-2 max-h-40 overflow-y-auto mb-3">
                {cart.map((item, index) => (
                  <div key={index} className="flex justify-between text-sm">
                    <span>{item.product_name} x{item.quantity}</span>
                    <span>{formatRupiah(item.subtotal)}</span>
                  </div>
                ))}
              </div>
              
              {/* Subtotal */}
              <div className="flex justify-between text-sm pt-2 border-t">
                <span>Subtotal</span>
                <span>{formatRupiah(getSubtotal())}</span>
              </div>
              
              {/* Discount (if applied) */}
              {appliedDiscount && (
                <div className="flex justify-between text-sm text-green-600">
                  <span>Diskon ({appliedDiscount.code})</span>
                  <span>-{formatRupiah(getDiscountAmount())}</span>
                </div>
              )}
              
              {/* Total */}
              <div className="flex justify-between text-lg font-bold pt-2 border-t mt-2">
                <span>Total:</span>
                <span className="text-primary-600">{formatRupiah(getTotalAmount())}</span>
              </div>
            </div>

            <div className="flex space-x-3 pt-4">
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
                <label className="flex items-center p-4 border-2 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                  <input
                    type="radio"
                    name="payment_method"
                    value="qris"
                    checked={paymentMethod === 'qris'}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="mr-4"
                  />
                  <div className="flex-1">
                    <div className="flex items-center">
                      <svg className="w-8 h-8 text-primary-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                      </svg>
                      <div>
                        <p className="font-bold">QRIS</p>
                        <p className="text-sm text-gray-600">Scan QR Code & Upload Bukti</p>
                      </div>
                    </div>
                  </div>
                </label>

                <label className="flex items-center p-4 border-2 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
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
                        <p className="font-bold">Bayar Cash</p>
                        <p className="text-sm text-gray-600">Bayar langsung / Bisa Di kasir</p>
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
                <span className="text-primary-600">{formatRupiah(getTotalAmount())}</span>
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
                onClick={handleSkipUpload}
                className="flex-1 btn-secondary"
                disabled={loading}
              >
                Upload Nanti
              </button>
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