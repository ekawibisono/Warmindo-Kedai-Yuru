import React from 'react';

const Cart = ({ cart, onClose, onRemove, onUpdateQty, onCheckout }) => {
  const formatRupiah = (number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(number);
  };

  const getTotalAmount = () => {
    return cart.reduce((sum, item) => sum + item.subtotal, 0);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end sm:items-center justify-center p-0 sm:p-4 z-50">
      <div className="bg-white rounded-t-3xl sm:rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center rounded-t-3xl sm:rounded-t-2xl">
          <h2 className="text-2xl font-bold text-gray-900">
            🛒 Cart ({cart.length})
          </h2>
          <button
            onClick={onClose}
            className="w-10 h-10 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center transition-colors"
          >
            <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto p-6">
          {cart.length === 0 ? (
            <div className="text-center py-16">
              <div className="text-6xl mb-4">🛒</div>
              <p className="text-gray-500 text-lg mb-2">Cart Anda kosong</p>
              <p className="text-gray-400 text-sm">Tambahkan menu untuk melanjutkan</p>
            </div>
          ) : (
            <div className="space-y-4">
              {cart.map((item) => (
                <div key={item.id} className="bg-gray-50 rounded-xl p-4 hover:bg-gray-100 transition-colors">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                      <h3 className="font-bold text-gray-900 text-lg">{item.product_name}</h3>
                      <p className="text-primary-600 font-medium">{formatRupiah(item.base_price)}</p>
                    </div>
                    <button
                      onClick={() => onRemove(item.id)}
                      className="text-red-500 hover:text-red-700 p-2 hover:bg-red-50 rounded-lg transition-colors"
                      title="Hapus dari cart"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>

                  {/* Modifiers */}
                  {item.modifiers && item.modifiers.length > 0 && (
                    <div className="mb-3 pl-3 border-l-2 border-primary-300">
                      <p className="text-xs font-medium text-gray-600 mb-1">Add-ons:</p>
                      {item.modifiers.map((mod, midx) => (
                        <div key={midx} className="flex justify-between text-sm text-gray-700">
                          <span>• {mod.name}</span>
                          {mod.price > 0 && (
                            <span className="text-primary-600">+{formatRupiah(mod.price)}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Quantity Controls & Subtotal */}
                  <div className="flex items-center justify-between pt-3 border-t border-gray-200">
                    <div className="flex items-center space-x-3">
                      <button
                        onClick={() => onUpdateQty(item.id, item.quantity - 1)}
                        className="w-8 h-8 bg-white border-2 border-gray-300 hover:border-primary-500 rounded-lg flex items-center justify-center text-gray-700 hover:text-primary-600 font-bold transition-colors"
                      >
                        −
                      </button>
                      <span className="text-lg font-bold text-gray-900 min-w-[2rem] text-center">{item.quantity}</span>
                      <button
                        onClick={() => onUpdateQty(item.id, item.quantity + 1)}
                        className="w-8 h-8 bg-primary-600 hover:bg-primary-700 rounded-lg flex items-center justify-center text-white font-bold transition-colors"
                      >
                        +
                      </button>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-500">Subtotal</p>
                      <p className="text-xl font-bold text-gray-900">{formatRupiah(item.subtotal)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {cart.length > 0 && (
          <div className="sticky bottom-0 bg-white border-t p-6 rounded-b-3xl sm:rounded-b-2xl">
            <div className="mb-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-gray-600">Total Items:</span>
                <span className="font-medium text-gray-900">{cart.reduce((sum, item) => sum + item.quantity, 0)} items</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-lg font-bold text-gray-900">Total Pembayaran:</span>
                <span className="text-2xl font-bold text-primary-600">{formatRupiah(getTotalAmount())}</span>
              </div>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={onClose}
                className="flex-1 px-6 py-4 bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold rounded-xl transition-colors"
              >
                Lanjut Belanja
              </button>
              <button
                onClick={onCheckout}
                className="flex-1 px-6 py-4 bg-primary-600 hover:bg-primary-700 text-white font-bold rounded-xl shadow-lg transition-colors"
              >
                Checkout
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Cart;