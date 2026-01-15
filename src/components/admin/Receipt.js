import React, { useRef } from 'react';

const Receipt = ({ order, items, onClose }) => {
    const receiptRef = useRef(null);

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
        return new Date(dateString).toLocaleString('id-ID', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const handlePrint = () => {
        // Generate items HTML
        const itemsHTML = items.map(item => {
            const unitPrice = Number(item.price_snapshot || item.unit_price_snapshot || 0);
            const itemTotal = unitPrice * Number(item.qty);
            
            const modifiersHTML = (item.modifiers && item.modifiers.length > 0) 
                ? item.modifiers.map(mod => {
                    const modPrice = Number(mod.price_delta_snapshot || 0);
                    return `<div class="modifier">+ ${mod.modifier_name_snapshot}${modPrice > 0 ? ` (+${formatRupiah(modPrice * Number(item.qty))})` : ''}</div>`;
                }).join('')
                : '';

            return `
                <div class="item">
                    <div class="item-name">${item.product_name_snapshot}</div>
                    <div class="item-detail">
                        <span>${item.qty} x ${formatRupiah(unitPrice)}</span>
                        <span>${formatRupiah(itemTotal)}</span>
                    </div>
                    ${modifiersHTML}
                </div>
            `;
        }).join('');

        // Generate notes HTML
        const notesHTML = order.notes ? `
            <div class="notes">
                <strong>Catatan:</strong><br/>
                ${order.notes}
            </div>
        ` : '';

        const printWindow = window.open('', '', 'width=400,height=600');
        
        printWindow.document.write(`
            <html>
                <head>
                    <title>Struk - ${order.order_no}</title>
                    <style>
                        * {
                            margin: 0;
                            padding: 0;
                            box-sizing: border-box;
                        }
                        body {
                            font-family: 'Courier New', monospace;
                            font-size: 12px;
                            padding: 10px;
                            max-width: 300px;
                            margin: 0 auto;
                            line-height: 1.4;
                        }
                        .header {
                            text-align: center;
                            margin-bottom: 10px;
                            padding-bottom: 10px;
                            border-bottom: 2px dashed #000;
                        }
                        .store-name {
                            font-size: 18px;
                            font-weight: bold;
                            margin-bottom: 5px;
                        }
                        .store-info {
                            font-size: 10px;
                            color: #333;
                        }
                        .section {
                            margin-bottom: 10px;
                            padding-bottom: 10px;
                            border-bottom: 1px dashed #000;
                        }
                        .row {
                            display: flex;
                            justify-content: space-between;
                            margin-bottom: 3px;
                        }
                        .row span:last-child {
                            text-align: right;
                        }
                        .item {
                            margin-bottom: 8px;
                        }
                        .item-name {
                            font-weight: bold;
                        }
                        .item-detail {
                            display: flex;
                            justify-content: space-between;
                            padding-left: 10px;
                            font-size: 11px;
                        }
                        .modifier {
                            font-size: 10px;
                            padding-left: 15px;
                            color: #555;
                        }
                        .totals {
                            margin-bottom: 10px;
                            padding-bottom: 10px;
                            border-bottom: 2px dashed #000;
                        }
                        .grand-total {
                            font-size: 14px;
                            font-weight: bold;
                            margin-top: 5px;
                        }
                        .footer {
                            text-align: center;
                            margin-top: 15px;
                        }
                        .thank-you {
                            font-size: 14px;
                            font-weight: bold;
                            margin-bottom: 5px;
                        }
                        .notes {
                            margin: 10px 0;
                            padding: 8px;
                            border: 1px dashed #000;
                            font-size: 10px;
                        }
                        @media print {
                            body { padding: 0; margin: 0; }
                        }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <div class="store-name">KEDAI YURU</div>
                        <div class="store-info">Jl. Contoh Alamat No. 123</div>
                        <div class="store-info">Semarang</div>
                        <div class="store-info">Telp: 0812-3456-7890</div>
                    </div>

                    <div class="section">
                        <div class="row">
                            <span>No. Order:</span>
                            <span><strong>${order.order_no}</strong></span>
                        </div>
                        <div class="row">
                            <span>Tanggal:</span>
                            <span>${formatDate(order.created_at)}</span>
                        </div>
                        <div class="row">
                            <span>Customer:</span>
                            <span>${order.customer_name || '-'}</span>
                        </div>
                        <div class="row">
                            <span>Tipe:</span>
                            <span><strong>${order.type === 'delivery' ? 'DELIVERY' : order.type === 'dine_in' ? 'DINE IN' : 'PICKUP'}</strong></span>
                        </div>
                        <div class="row">
                            <span>Pembayaran:</span>
                            <span>${(order.payment_method || '').toUpperCase()}</span>
                        </div>
                    </div>

                    <div class="section">
                        <strong>PESANAN:</strong>
                        <br/><br/>
                        ${itemsHTML}
                    </div>

                    <div class="totals">
                        <div class="row">
                            <span>Subtotal:</span>
                            <span>${formatRupiah(subtotal)}</span>
                        </div>
                        <div class="row grand-total">
                            <span>TOTAL:</span>
                            <span>${formatRupiah(order.grand_total)}</span>
                        </div>
                    </div>

                    ${notesHTML}

                    <div class="footer">
                        <div class="thank-you">Terima Kasih!</div>
                        <div>Selamat menikmati</div>
                        <br/>
                        <div>--- Kedai Yuru ---</div>
                    </div>
                </body>
            </html>
        `);
        
        printWindow.document.close();
        printWindow.focus();
        
        setTimeout(() => {
            printWindow.print();
            printWindow.close();
        }, 250);
    };

    // Calculate subtotal
    const subtotal = items.reduce((sum, item) => {
        const itemPrice = Number(item.price_snapshot || item.unit_price_snapshot || 0) * Number(item.qty || 0);
        const modifiersPrice = (item.modifiers || []).reduce((mSum, mod) => {
            return mSum + (Number(mod.price_delta_snapshot || 0) * Number(mod.qty || 1));
        }, 0) * Number(item.qty || 0);
        return sum + itemPrice + modifiersPrice;
    }, 0);

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold text-gray-900">Preview Struk</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Receipt Preview */}
                <div className="bg-gray-100 p-4 rounded-lg mb-4">
                    <div ref={receiptRef} className="bg-white p-4 font-mono text-xs" style={{ maxWidth: '300px', margin: '0 auto' }}>
                        {/* Store Header */}
                        <div className="text-center mb-4 pb-3 border-b-2 border-dashed border-gray-400">
                            <h1 className="text-lg font-bold">KEDAI YURU</h1>
                            <p className="text-[10px] text-gray-600">Jl. Contoh Alamat No. 123</p>
                            <p className="text-[10px] text-gray-600">Semarang</p>
                            <p className="text-[10px] text-gray-600">Telp: 0812-3456-7890</p>
                        </div>

                        {/* Order Info */}
                        <div className="mb-3 pb-3 border-b border-dashed border-gray-400">
                            <div className="flex justify-between mb-1">
                                <span>No. Order:</span>
                                <span className="font-bold">{order.order_no}</span>
                            </div>
                            <div className="flex justify-between mb-1">
                                <span>Tanggal:</span>
                                <span>{formatDate(order.created_at)}</span>
                            </div>
                            <div className="flex justify-between mb-1">
                                <span>Customer:</span>
                                <span>{order.customer_name || '-'}</span>
                            </div>
                            <div className="flex justify-between mb-1">
                                <span>Tipe:</span>
                                <span className="font-bold">{order.type === 'delivery' ? 'DELIVERY' : order.type === 'dine_in' ? 'DINE IN' : 'PICKUP'}</span>
                            </div>
                            <div className="flex justify-between">
                                <span>Pembayaran:</span>
                                <span className="uppercase">{order.payment_method}</span>
                            </div>
                        </div>

                        {/* Items */}
                        <div className="mb-3 pb-3 border-b border-dashed border-gray-400">
                            <p className="font-bold mb-2">PESANAN:</p>
                            {items.map((item, idx) => {
                                const unitPrice = Number(item.price_snapshot || item.unit_price_snapshot || 0);
                                const itemTotal = unitPrice * Number(item.qty);
                                // eslint-disable-next-line no-unused-vars
                                const modifiersTotal = (item.modifiers || []).reduce((sum, mod) => {
                                    return sum + (Number(mod.price_delta_snapshot || 0) * Number(item.qty));
                                }, 0);
                                
                                return (
                                <div key={idx} className="mb-2">
                                    <div className="flex justify-between">
                                        <span className="font-bold">{item.product_name_snapshot}</span>
                                    </div>
                                    <div className="flex justify-between pl-2">
                                        <span>{item.qty} x {formatRupiah(unitPrice)}</span>
                                        <span>{formatRupiah(itemTotal)}</span>
                                    </div>
                                    {item.modifiers && item.modifiers.length > 0 && (
                                        <div className="pl-3 text-[10px] text-gray-600">
                                            {item.modifiers.map((mod, midx) => (
                                                <div key={midx} className="flex justify-between">
                                                    <span>+ {mod.modifier_name_snapshot}</span>
                                                    {Number(mod.price_delta_snapshot) > 0 && (
                                                        <span>+{formatRupiah(Number(mod.price_delta_snapshot) * Number(item.qty))}</span>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                );
                            })}
                        </div>

                        {/* Totals */}
                        <div className="mb-3 pb-3 border-b-2 border-dashed border-gray-400">
                            <div className="flex justify-between mb-1">
                                <span>Subtotal:</span>
                                <span>{formatRupiah(subtotal)}</span>
                            </div>
                            <div className="flex justify-between font-bold text-sm mt-2">
                                <span>TOTAL:</span>
                                <span>{formatRupiah(order.grand_total)}</span>
                            </div>
                        </div>

                        {/* Notes */}
                        {order.notes && (
                            <div className="mb-3 p-2 border border-dashed border-gray-400">
                                <p className="text-[10px] font-bold">Catatan:</p>
                                <p className="text-[10px]">{order.notes}</p>
                            </div>
                        )}

                        {/* Footer */}
                        <div className="text-center mt-4">
                            <p className="font-bold mb-1">Terima Kasih!</p>
                            <p className="text-[10px] text-gray-600">Selamat menikmati</p>
                            <p className="text-[10px] text-gray-600 mt-2">--- Kedai Yuru ---</p>
                        </div>
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 px-4 py-3 bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium rounded-lg transition-colors"
                    >
                        Tutup
                    </button>
                    <button
                        onClick={handlePrint}
                        className="flex-1 px-4 py-3 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                        </svg>
                        Print Struk
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Receipt;