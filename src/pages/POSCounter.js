import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '../components/admin/AdminLayout';
import Receipt from '../components/admin/Receipt';
import { publicAPI, staffAPI } from '../services/api';
import notify from '../components/common/Toast';

const POSCounter = () => {
    const [menu, setMenu] = useState({
        products: [],
        categories: [],
        modifier_groups: [],
        modifiers: [],
        product_modifier_groups: [],
    });
    const [loading, setLoading] = useState(true);
    const [cart, setCart] = useState([]);
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [selectedModifiers, setSelectedModifiers] = useState({});
    const [quantity, setQuantity] = useState(1);
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [receipt, setReceipt] = useState(null);
    const [showReceiptModal, setShowReceiptModal] = useState(false);
    const [waPhone, setWaPhone] = useState("");
    const [showAdvancedReceipt, setShowAdvancedReceipt] = useState(false);
    const navigate = useNavigate();
    const [showMobileCart, setShowMobileCart] = useState(false);
    // const [showMaintenance, setShowMaintenance] = useState(false);
    useEffect(() => {
        if (showReceiptModal && receipt) setWaPhone(receipt.customer_phone || "");
    }, [showReceiptModal, receipt]);
    useEffect(() => {
        const staffKey = localStorage.getItem('staff_key');
        if (!staffKey) {
            notify.error('Anda harus login sebagai staff untuk mengakses POS');
            navigate('/admin/login');
        }
    }, [navigate]);

    // Customer info untuk order
    const [customerInfo, setCustomerInfo] = useState({
        customer_name: '',
        customer_phone: '',
        order_type: 'dine_in',
        payment_method: 'cash',
        delivery_address: '',
        delivery_notes: '',
        discount_code: '',
    });

    useEffect(() => {
        fetchMenu();
    }, []);

    const fetchMenu = async () => {
        try {
            const response = await publicAPI.getMenu();
            setMenu(response.data);
        } catch (error) {
            console.error('Error fetching menu:', error);
            notify.error('Gagal memuat menu');
        } finally {
            setLoading(false);
        }
    };
    const API_BASE_URL = process.env.REACT_APP_API_URL
    const normalizePhone62 = (raw) => {
        const digits = String(raw || "").replace(/\D/g, "");
        if (!digits) return "";

        if (digits.startsWith("62")) return digits;     // 62xxxx
        if (digits.startsWith("0")) return "62" + digits.slice(1); // 08xx -> 628xx
        if (digits.startsWith("8")) return "62" + digits; // 8xx -> 628xx
        return digits;
    };
    const mapPosReceiptToReceiptJsShape = (r) => {
        const order = {
            order_no: r.order_no,
            created_at: r.created_at,
            customer_name: r.customer_name,
            type: r.type, // dine_in / pickup / delivery
            payment_method: r.payment_method,
            notes: r.notes || null,
            grand_total: Number(r.grand_total || 0),
            id: r.id || `pos-${Date.now()}`, // Add ID for Receipt component
        };

        const items = (r.items || []).map((it) => ({
            product_name_snapshot: it.product_name,
            qty: Number(it.quantity || 0),
            price_snapshot: Number(it.product_price || 0),
            unit_price_snapshot: Number(it.product_price || 0), // Add fallback
            modifiers: (it.modifiers || []).map((m) => ({
                modifier_name_snapshot: m.name,
                price_delta_snapshot: Number(m.price_delta || 0),
                qty: Number(m.quantity || 1),
            })),
        }));

        return { order, items };
    };

    // Function to open advanced Receipt component
    const openAdvancedReceipt = (r) => {
        const { order, items } = mapPosReceiptToReceiptJsShape(r);
        // Store in state for Receipt component
        window.tempReceiptData = { order, items };
        setShowAdvancedReceipt(true);
    };

    const buildReceiptTextFromReceiptJs = (order, items) => {
        // INFO TOKO (sesuaikan dengan data toko Anda)
        const storeName = "KEDAI YURU";
        const storeAddress = "Jl. Wonolopo (Sebrang Prima Futsal) RT.02 RW.07, Semarang";
        const storePhone = "0823-2497-5131";

        let receipt = `═══════════════════════\n`;
        receipt += `     ${storeName}\n`;
        receipt += `═══════════════════════\n`;
        receipt += `${storeAddress}\n`;
        receipt += `Telp: ${storePhone}\n`;
        receipt += `\n`;

        receipt += `📋 *STRUK PEMBAYARAN*\n`;
        receipt += `───────────────────────\n`;
        receipt += `No. Order  : *${order.order_no}*\n`;
        receipt += `Tanggal    : ${formatDate(order.created_at)}\n`;
        receipt += `Kasir      : ${order.cashier_name || '-'}\n`;
        receipt += `Customer   : ${order.customer_name}\n`;

        // Tipe order dengan emoji
        let orderTypeText = '';
        if (order.type === 'dine_in') {
            orderTypeText = '🍽️ Dine In';
        } else if (order.type === 'delivery') {
            orderTypeText = '🛵 Delivery';
        } else if (order.type === 'pickup') {
            orderTypeText = '🥡 Pickup';
        }
        receipt += `Tipe       : ${orderTypeText}\n`;

        // Payment method dengan emoji
        let paymentText = '';
        if (order.payment_method === 'cash') {
            paymentText = '💵 Cash';
        } else if (order.payment_method === 'qris') {
            paymentText = '📱 QRIS';
        } else if (order.payment_method === 'transfer') {
            paymentText = '🏦 Transfer';
        } else {
            paymentText = order.payment_method?.toUpperCase() || 'CASH';
        }
        receipt += `Pembayaran : ${paymentText}\n`;
        receipt += `───────────────────────\n\n`;

        // Items detail dengan harga
        receipt += `📦 *DETAIL PESANAN*\n`;
        receipt += `───────────────────────\n`;

        let subtotal = 0;

        (items || []).forEach((item, index) => {
            const itemPrice = Number(item.price_snapshot || item.unit_price_snapshot || 0);
            const qty = Number(item.qty || 0);

            receipt += `${index + 1}. *${item.product_name_snapshot}*\n`;
            receipt += `   ${qty}x @ ${formatRupiah(itemPrice)}\n`;

            // Add modifiers if any
            let modifiersTotal = 0;
            if (item.modifiers && item.modifiers.length > 0) {
                item.modifiers.forEach(mod => {
                    const modPrice = Number(mod.price_delta_snapshot || 0);
                    const modQty = Number(mod.qty || 1);
                    const modTotal = modPrice * modQty;
                    modifiersTotal += modTotal;

                    if (modPrice > 0) {
                        receipt += `   + ${mod.modifier_name_snapshot} (${formatRupiah(modPrice)})\n`;
                    } else {
                        receipt += `   + ${mod.modifier_name_snapshot}\n`;
                    }
                });
            }

            // Item total
            const totalWithMods = (itemPrice + (modifiersTotal / qty)) * qty;
            receipt += `   = ${formatRupiah(totalWithMods)}\n`;
            receipt += `\n`;

            subtotal += totalWithMods;
        });

        receipt += `───────────────────────\n`;
        receipt += `Subtotal   : ${formatRupiah(subtotal)}\n`;

        // Discount jika ada
        if (order.discount_amount && Number(order.discount_amount) > 0) {
            receipt += `Diskon     : -${formatRupiah(order.discount_amount)}\n`;
        }

        // Tax jika ada
        if (order.tax_amount && Number(order.tax_amount) > 0) {
            receipt += `Pajak      : ${formatRupiah(order.tax_amount)}\n`;
        }

        receipt += `───────────────────────\n`;
        receipt += `*TOTAL      : ${formatRupiah(order.grand_total)}*\n`;
        receipt += `───────────────────────\n`;

        // Notes jika ada
        if (order.notes) {
            receipt += `\n📝 Catatan:\n${order.notes}\n`;
        }

        receipt += `\n`;
        receipt += `═══════════════════════\n`;
        receipt += `   *Terima Kasih!*\n`;
        receipt += `   Selamat Menikmati 😊\n`;
        receipt += `═══════════════════════\n`;

        return receipt;
    };

    // eslint-disable-next-line no-unused-vars
    const buildReceiptHTML = (r) => {
        // r.items di POSCounter: { product_name, product_price, quantity, subtotal, modifiers[] }
        const itemsHTML = (r.items || []).map((item) => {
            const unitPrice = Number(item.product_price || 0);
            const qty = Number(item.quantity || 0);
            const itemTotal = unitPrice * qty;

            const modifiersHTML = (item.modifiers && item.modifiers.length > 0)
                ? item.modifiers.map((mod) => {
                    const modPrice = Number(mod.price_delta || 0);
                    // di Receipt.js, mod price ditampilkan * qty
                    return `<div class="modifier">+ ${mod.name}${modPrice > 0 ? ` (+${formatRupiah(modPrice * qty)})` : ''}</div>`;
                }).join('')
                : '';

            return `
      <div class="item">
        <div class="item-name">${item.product_name}</div>
        <div class="item-detail">
          <span>${qty} x ${formatRupiah(unitPrice)}</span>
          <span>${formatRupiah(itemTotal)}</span>
        </div>
        ${modifiersHTML}
      </div>
    `;
        }).join('');

        // subtotal versi Receipt.js (item price + modifiers price) -> kalau di POS kamu sudah ada subtotal per item, bisa pakai itu juga.
        const subtotal = (r.items || []).reduce((sum, item) => {
            const unitPrice = Number(item.product_price || 0);
            const qty = Number(item.quantity || 0);
            const base = unitPrice * qty;

            const mods = (item.modifiers || []).reduce((mSum, mod) => mSum + Number(mod.price_delta || 0), 0) * qty;
            return sum + base + mods;
        }, 0);

        const notesHTML = r.notes ? `
    <div class="notes">
      <strong>Catatan:</strong><br/>
      ${r.notes}
    </div>
  ` : '';

        return `
    <html>
      <head>
        <title>Struk - ${r.order_no || ''}</title>
        <style>
          * { margin:0; padding:0; box-sizing:border-box; }
          /* 58mm */
          @page { size: 58mm auto; margin: 3mm; }
          body {
            font-family: 'Courier New', monospace;
            font-size: 12px;
            padding: 0;
            width: 58mm;
            line-height: 1.35;
          }
          .header {
            text-align: center;
            margin-bottom: 8px;
            padding-bottom: 8px;
            border-bottom: 2px dashed #000;
          }
          .store-name { font-size: 14px; font-weight: bold; margin-bottom: 4px; }
          .store-info { font-size: 9px; color: #333; }
          .section {
            margin-bottom: 8px;
            padding-bottom: 8px;
            border-bottom: 1px dashed #000;
          }
          .row { display:flex; justify-content:space-between; margin-bottom: 3px; gap: 8px; }
          .row span:last-child { text-align:right; white-space:nowrap; }
          .item { margin-bottom: 6px; }
          .item-name { font-weight:bold; }
          .item-detail {
            display:flex;
            justify-content:space-between;
            padding-left: 8px;
            font-size: 10px;
            gap: 8px;
          }
          .modifier {
            font-size: 9px;
            padding-left: 12px;
            color: #555;
          }
          .totals {
            margin-bottom: 8px;
            padding-bottom: 8px;
            border-bottom: 2px dashed #000;
          }
          .grand-total { font-size: 12px; font-weight:bold; margin-top: 5px; }
          .footer { text-align:center; margin-top: 10px; }
          .thank-you { font-size: 12px; font-weight:bold; margin-bottom: 3px; }
          .notes {
            margin: 8px 0;
            padding: 6px;
            border: 1px dashed #000;
            font-size: 9px;
          }
          @media print { body { margin:0; } }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="store-name">KEDAI YURU</div>
          <div class="store-info">Jl. Wonolopo ( Sebrang Prima Futsal ) RT.02 RW.07</div>
          <div class="store-info">Semarang</div>
          <div class="store-info">WhatsApp: 0823-2497-5131</div>
        </div>

        <div class="section">
          <div class="row"><span>No. Order:</span><span><strong>${r.order_no || '-'}</strong></span></div>
          <div class="row"><span>Tanggal:</span><span>${formatDate(r.created_at)}</span></div>
          <div class="row"><span>Customer:</span><span>${r.customer_name || '-'}</span></div>
          <div class="row"><span>Tipe:</span><span><strong>${r.type === 'delivery' ? 'DELIVERY' : r.type === 'dine_in' ? 'DINE IN' : 'PICKUP'}</strong></span></div>
          <div class="row"><span>Pembayaran:</span><span>${String(r.payment_method || '').toUpperCase()}</span></div>
        </div>

        <div class="section">
          <strong>PESANAN:</strong><br/><br/>
          ${itemsHTML}
        </div>

        <div class="totals">
          <div class="row"><span>Subtotal:</span><span>${formatRupiah(subtotal)}</span></div>
          <div class="row grand-total"><span>TOTAL:</span><span>${formatRupiah(r.grand_total || 0)}</span></div>
        </div>

        ${notesHTML}

        <div class="footer">
          <div class="thank-you">Terima Kasih!</div>
          <div>Selamat menikmati</div><br/>
          <div>--- Kedai Yuru ---</div>
        </div>

        <script>
          window.onload = () => {
            window.print();
            window.onafterprint = () => window.close();
          };
        </script>
      </body>
    </html>
  `;
    };

    const sendReceiptWhatsApp = async (r, phoneOverride) => {
        const staffKey = localStorage.getItem("staff_key") || "";
        if (!staffKey) {
            notify.error("Staff key tidak ada. Login ulang dulu ya.");
            return false;
        }
        const target = normalizePhone62(phoneOverride || r.customer_phone);
        if (!target) {
            notify.error("Nomor WhatsApp wajib diisi untuk kirim nota.");
            return false;
        }
        const { order, items } = mapPosReceiptToReceiptJsShape(r);
        const message = buildReceiptTextFromReceiptJs(order, items);
        try {
            const res = await fetch(`${API_BASE_URL}/whatsapp/send`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "x-staff-key": staffKey,
                },
                body: JSON.stringify({ target, message }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                notify.error(data?.message || data?.error || "Gagal kirim WhatsApp.");
                return false;
            }

            notify.success("✅ Nota terkirim via WhatsApp.");
            return true;
        } catch (err) {
            console.error(err);
            notify.error("Gagal kirim WhatsApp (cek koneksi/backend).");
            return false;
        }
    };

    const formatRupiah = (amount) => {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0,
        }).format(amount);
    };

    const getProductModifierGroups = (productId) => {
        const mappings = (menu.product_modifier_groups || [])
            .filter((pmg) => pmg.product_id === productId)
            .sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
        return mappings
            .map((pmg) => menu.modifier_groups.find((g) => g.id === pmg.group_id))
            .filter(Boolean);
    };

    const getGroupModifiers = (groupId) => {
        return (menu.modifiers || [])
            .filter((m) => m.group_id === groupId && m.is_active)
            .sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
    };

    const handleSelectProduct = (product) => {
        setSelectedProduct(product);
        setSelectedModifiers({});
        setQuantity(1);
    };

    const handleModifierChange = (groupId, modifierId, checked) => {
        const group = menu.modifier_groups.find(g => g.id === groupId);
        const isSingleSelection = group.selection_type === 'single';

        setSelectedModifiers(prev => {
            const current = prev[groupId] || [];

            if (isSingleSelection) {
                // Untuk single selection, langsung replace dengan yang dipilih
                return { ...prev, [groupId]: [modifierId] };
            } else {
                // Untuk multiple selection
                if (checked) {
                    if (current.length >= group.max_select) {
                        notify.warning(`Maksimal ${group.max_select} pilihan untuk ${group.name}`);
                        return prev;
                    }
                    return { ...prev, [groupId]: [...current, modifierId] };
                } else {
                    return { ...prev, [groupId]: current.filter(id => id !== modifierId) };
                }
            }
        });
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

    const calculateItemSubtotal = () => {
        if (!selectedProduct) return 0;
        // Gunakan original_price jika produk adalah hot deal, jika tidak pakai harga normal
        let price = selectedProduct.original_price || selectedProduct.price;

        Object.values(selectedModifiers).flat().forEach(modId => {
            const modifier = menu.modifiers.find(m => m.id === modId);
            if (modifier) price += modifier.price_delta;
        });

        return price * quantity;
    };

    const canAddToCart = () => {
        if (!selectedProduct) return false;
        const groups = getProductModifierGroups(selectedProduct.id);
        return groups.every(group => {
            if (!group.is_required) return true;
            const selected = selectedModifiers[group.id] || [];
            return selected.length >= group.min_select;
        });
    };

    const addToCart = () => {
        if (!canAddToCart()) return;
        const orderedGroups = getProductModifierGroups(selectedProduct.id);

        const modifiers = orderedGroups.flatMap((group) => {
            const selected = selectedModifiers[group.id] || [];
            const orderedMods = getGroupModifiers(group.id).filter((m) => selected.includes(m.id));

            return orderedMods.map((m) => ({
                modifier_id: m.id,
                quantity: 1,
                name: m.name,
                price_delta: m.price_delta || 0,
                group_id: group.id,
                group_name: group.name,
            }));
        });

        const cartItem = {
            product_id: selectedProduct.id,
            product_name: selectedProduct.name,
            product_price: selectedProduct.original_price || selectedProduct.price,
            quantity,
            modifiers,
            subtotal: calculateItemSubtotal()
        };

        setCart([...cart, cartItem]);
        setSelectedProduct(null);
        notify.success(`${selectedProduct.name} ditambahkan ke cart`);
    };

    const removeFromCart = (index) => {
        setCart(cart.filter((_, i) => i !== index));
    };

    const updateCartItemQty = (index, newQty) => {
        const qty = Number(newQty);
        if (!Number.isFinite(qty) || qty < 1) return;

        setCart(prev => {
            const updated = [...prev];
            const item = { ...updated[index] };

            const mods = Array.isArray(item.modifiers) ? item.modifiers : [];
            const modifiersTotal = mods.reduce((sum, m) => sum + Number(m?.price_delta || 0), 0);

            const basePrice = Number(item.product_price || 0) + modifiersTotal;

            item.quantity = qty;
            item.subtotal = basePrice * qty;

            updated[index] = item;
            return updated;
        });
    };

    const getTotalAmount = () => {
        return cart.reduce((sum, item) => sum + item.subtotal, 0);
    };

    const handleSubmitOrder = async () => {
        if (cart.length === 0) {
            notify.error('Cart masih kosong');
            return;
        }

        if (!customerInfo.customer_name) {
            notify.error('Nama pelanggan wajib diisi');
            return;
        }

        if (customerInfo.order_type === 'delivery' && !customerInfo.delivery_address) {
            notify.error('Alamat pengiriman wajib diisi');
            return;
        }

        try {
            // Build notes based on order type
            let notes = null;
            if (customerInfo.order_type === 'delivery') {
                notes = `${customerInfo.delivery_address || ''}${customerInfo.delivery_notes ? ' | ' + customerInfo.delivery_notes : ''}`;
            } else if (customerInfo.order_type === 'dine_in') {
                notes = customerInfo.delivery_notes ? `Nomor Meja: ${customerInfo.delivery_notes}` : null;
            }

            const orderData = {
                customer_name: customerInfo.customer_name,
                customer_phone: customerInfo.customer_phone,
                type: customerInfo.order_type, // Backend expects 'type', not 'order_type'
                payment_method: customerInfo.payment_method,
                notes,
                discount_code: customerInfo.discount_code || null,
                items: cart.map(item => ({
                    product_id: item.product_id,
                    qty: item.quantity, // Backend expects 'qty', not 'quantity'
                    modifiers: item.modifiers.map(m => ({
                        modifier_id: m.modifier_id,
                        qty: m.quantity // Backend expects 'qty', not 'quantity'
                    }))
                }))
            };

            const response = await staffAPI.createPosCashOrder(orderData);
            const created = response.data;
            setReceipt({
                order_no: created.order_no,
                created_at: created.created_at || new Date().toISOString(),
                customer_name: customerInfo.customer_name,
                customer_phone: customerInfo.customer_phone,
                type: customerInfo.order_type,
                payment_method: customerInfo.payment_method,
                notes,
                items: cart,
                grand_total: created.grand_total ?? getTotalAmount(),
            });

            setShowReceiptModal(true);
            // If cash payment, auto-approve it
            if (customerInfo.payment_method === 'cash') {
                notify.success(`Order ${response.data.order_no} berhasil dibuat!`);
            } else {
                notify.success(`Order ${response.data.order_no} berhasil dibuat dan sudah masuk dapur!`);
            }

            // Reset form
            setCart([]);
            setCustomerInfo({
                customer_name: '',
                customer_phone: '',
                order_type: 'dine_in',
                payment_method: 'cash',
                delivery_address: '',
                delivery_notes: '',
                discount_code: '',
            });
            setShowPaymentModal(false);
        } catch (error) {
            console.error('Error creating order:', error);
            notify.error(error.response?.data?.error || 'Gagal membuat order');
        }
    };

    const filteredProducts = menu.products.filter(product => {
        if (!product.is_active) return false;
        const matchesCategory = selectedCategory === 'all' || product.category_id === selectedCategory;
        const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesCategory && matchesSearch;
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
            <div className="max-w-7xl mx-auto pb-40 lg:pb-0">
                <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-6">🛒 POS Kasir</h1>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Menu Section - 2 columns */}
                    <div className="lg:col-span-2">
                        {/* Search & Category Filter */}
                        <div className="bg-white rounded-lg shadow-md p-4 mb-4">
                            <input
                                type="text"
                                placeholder="🔍 Cari produk..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg mb-3"
                            />
                            <div className="flex gap-2 overflow-x-auto pb-2">
                                <button
                                    onClick={() => setSelectedCategory('all')}
                                    className={`px-4 py-2 rounded-full whitespace-nowrap ${selectedCategory === 'all'
                                        ? 'bg-primary-600 text-white'
                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                        }`}
                                >
                                    Semua
                                </button>
                                {menu.categories.map(cat => (
                                    <button
                                        key={cat.id}
                                        onClick={() => setSelectedCategory(cat.id)}
                                        className={`px-4 py-2 rounded-full whitespace-nowrap ${selectedCategory === cat.id
                                            ? 'bg-primary-600 text-white'
                                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                            }`}
                                    >
                                        {cat.name}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Products Grid */}
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 pb-4">
                            {filteredProducts.map(product => (
                                <div
                                    key={product.id}
                                    onClick={() => handleSelectProduct(product)}
                                    className="bg-white rounded-lg shadow-md p-4 cursor-pointer hover:shadow-lg transition-shadow"
                                >
                                    {product.image_url && (
                                        <img
                                            src={product.image_url}
                                            alt={product.name}
                                            className="w-full h-32 object-cover rounded-lg mb-3"
                                        />
                                    )}
                                    <h3 className="font-bold text-gray-900 mb-1">{product.name}</h3>
                                    <p className="text-primary-600 font-bold">
                                        {formatRupiah(product.original_price || product.price)}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Cart Section - 1 column */}
                    <div className="hidden lg:block bg-white rounded-lg shadow-md p-4">
                        <h2 className="text-xl font-bold text-gray-900 mb-4">Cart</h2>

                        {cart.length === 0 ? (
                            <p className="text-gray-500 text-center py-8">Cart masih kosong</p>
                        ) : (
                            <>
                                <div className="space-y-3 mb-4 max-h-96 overflow-y-auto">
                                    {cart.map((item, index) => (
                                        <div key={index} className="border-b pb-3">
                                            <div className="flex justify-between items-start mb-1">
                                                <div className="flex-1">
                                                    <p className="font-bold text-gray-900">{item.product_name}</p>
                                                    {item.modifiers.length > 0 && (
                                                        <p className="text-xs text-gray-600">
                                                            {item.modifiers.map(m => m.name).join(', ')}
                                                        </p>
                                                    )}
                                                </div>
                                                <button
                                                    onClick={() => removeFromCart(index)}
                                                    className="text-red-600 hover:text-red-700 ml-2"
                                                >
                                                    ✕
                                                </button>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={() => updateCartItemQty(index, item.quantity - 1)}
                                                        className="w-6 h-6 bg-gray-200 rounded text-sm"
                                                    >
                                                        −
                                                    </button>
                                                    <span className="w-8 text-center">{item.quantity}</span>
                                                    <button
                                                        onClick={() => updateCartItemQty(index, item.quantity + 1)}
                                                        className="w-6 h-6 bg-primary-600 text-white rounded text-sm"
                                                    >
                                                        +
                                                    </button>
                                                </div>
                                                <p className="font-bold text-primary-600">{formatRupiah(item.subtotal)}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <div className="border-t pt-3 mb-4">
                                    <div className="flex justify-between text-xl font-bold">
                                        <span>Total:</span>
                                        <span className="text-primary-600">{formatRupiah(getTotalAmount())}</span>
                                    </div>
                                </div>

                                <button
                                    onClick={() => setShowPaymentModal(true)}
                                    className="w-full py-3 bg-primary-600 text-white rounded-lg font-bold hover:bg-primary-700"
                                >
                                    Proses Pembayaran
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* Product Detail Modal */}
            {selectedProduct && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="p-6">
                            <div className="flex justify-between items-start mb-4">
                                <h2 className="text-2xl font-bold">{selectedProduct.name}</h2>
                                <button
                                    onClick={() => setSelectedProduct(null)}
                                    className="text-gray-500 hover:text-gray-700"
                                >
                                    ✕
                                </button>
                            </div>

                            {selectedProduct.image_url && (
                                <img
                                    src={selectedProduct.image_url}
                                    alt={selectedProduct.name}
                                    className="w-full h-64 object-cover rounded-lg mb-4"
                                />
                            )}

                            <p className="text-2xl font-bold text-primary-600 mb-4">
                                {formatRupiah(selectedProduct.original_price || selectedProduct.price)}
                            </p>

                            {selectedProduct.description && (
                                <p className="text-gray-600 mb-4">{selectedProduct.description}</p>
                            )}

                            {/* Modifiers */}
                            {getProductModifierGroups(selectedProduct.id).map(group => {
                                const modifiers = getGroupModifiers(group.id);
                                const isSingleSelection = group.selection_type === 'single';

                                return (
                                    <div key={group.id} className="mb-6">
                                        <h3 className="font-bold text-lg mb-2">
                                            {group.name}
                                            {group.is_required && <span className="text-red-500"> *</span>}
                                        </h3>
                                        <div className="space-y-2">
                                            {modifiers.map(modifier => {
                                                const isChecked = (selectedModifiers[group.id] || []).includes(modifier.id);
                                                return (
                                                    <label
                                                        key={modifier.id}
                                                        className={`flex items-center p-3 border-2 rounded-lg cursor-pointer ${isChecked ? 'border-primary-500 bg-primary-50' : 'border-gray-200'
                                                            }`}
                                                    >
                                                        <input
                                                            type={isSingleSelection ? 'radio' : 'checkbox'}
                                                            name={isSingleSelection ? `modifier-group-${group.id}` : undefined}
                                                            checked={isChecked}
                                                            onChange={(e) => handleModifierChange(group.id, modifier.id, e.target.checked)}
                                                            className="mr-3"
                                                        />
                                                        <span className="flex-1">{modifier.name}</span>
                                                        {modifier.price_delta > 0 && (
                                                            <span className="text-primary-600 font-bold">
                                                                +{formatRupiah(modifier.price_delta)}
                                                            </span>
                                                        )}
                                                    </label>
                                                );
                                            })}
                                        </div>
                                    </div>
                                );
                            })}

                            {/* Quantity */}
                            <div className="mb-6">
                                <h3 className="font-bold text-lg mb-3">Jumlah</h3>
                                <div className="flex items-center gap-4">
                                    <button
                                        onClick={() => setQuantity(Math.max(1, quantity - 1))}
                                        className="w-10 h-10 bg-gray-200 rounded-full"
                                    >
                                        −
                                    </button>
                                    <span className="text-xl font-bold">{quantity}</span>
                                    <button
                                        onClick={() => setQuantity(quantity + 1)}
                                        className="w-10 h-10 bg-primary-600 text-white rounded-full"
                                    >
                                        +
                                    </button>
                                </div>
                            </div>

                            <button
                                onClick={addToCart}
                                disabled={!canAddToCart()}
                                className={`w-full py-3 rounded-lg font-bold ${canAddToCart()
                                    ? 'bg-primary-600 text-white hover:bg-primary-700'
                                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                    }`}
                            >
                                Tambah ke Cart - {formatRupiah(calculateItemSubtotal())}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Payment Modal */}
            {showPaymentModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
                        <div className="p-6">
                            <h2 className="text-2xl font-bold mb-4">Info Pelanggan & Pembayaran</h2>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1">Nama Pelanggan *</label>
                                    <input
                                        type="text"
                                        value={customerInfo.customer_name}
                                        onChange={(e) => setCustomerInfo({ ...customerInfo, customer_name: e.target.value })}
                                        className="w-full px-3 py-2 border rounded-lg"
                                        placeholder="Nama pelanggan"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium mb-1">Nomor HP (Opsional)</label>
                                    <input
                                        type="text"
                                        value={customerInfo.customer_phone}
                                        onChange={(e) => setCustomerInfo({ ...customerInfo, customer_phone: e.target.value })}
                                        className="w-full px-3 py-2 border rounded-lg"
                                        placeholder="08xxxxxxxxxx (opsional)"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium mb-1">Tipe Order</label>
                                    <select
                                        value={customerInfo.order_type}
                                        onChange={(e) => setCustomerInfo({ ...customerInfo, order_type: e.target.value })}
                                        className="w-full px-3 py-2 border rounded-lg"
                                    >
                                        <option value="dine_in">🍽️ Dine In (Makan Di Tempat)</option>
                                        <option value="pickup">📦 Ambil Sendiri</option>
                                        <option value="delivery">🚚 Delivery</option>
                                    </select>
                                </div>

                                {customerInfo.order_type === 'dine_in' && (
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Nomor Meja</label>
                                        <input
                                            type="text"
                                            value={customerInfo.delivery_notes}
                                            onChange={(e) => setCustomerInfo({ ...customerInfo, delivery_notes: e.target.value })}
                                            className="w-full px-3 py-2 border rounded-lg"
                                            placeholder="Contoh: Meja 5"
                                        />
                                    </div>
                                )}

                                {customerInfo.order_type === 'delivery' && (
                                    <>
                                        <div>
                                            <label className="block text-sm font-medium mb-1">Alamat Pengiriman *</label>
                                            <textarea
                                                value={customerInfo.delivery_address}
                                                onChange={(e) => setCustomerInfo({ ...customerInfo, delivery_address: e.target.value })}
                                                className="w-full px-3 py-2 border rounded-lg"
                                                rows="3"
                                                placeholder="Alamat lengkap"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-1">Catatan Pengiriman</label>
                                            <input
                                                type="text"
                                                value={customerInfo.delivery_notes}
                                                onChange={(e) => setCustomerInfo({ ...customerInfo, delivery_notes: e.target.value })}
                                                className="w-full px-3 py-2 border rounded-lg"
                                                placeholder="Patokan lokasi"
                                            />
                                        </div>
                                    </>
                                )}

                                <div>
                                    <label className="block text-sm font-medium mb-1">Metode Pembayaran</label>
                                    <select
                                        value={customerInfo.payment_method}
                                        onChange={(e) => setCustomerInfo({ ...customerInfo, payment_method: e.target.value })}
                                        className="w-full px-3 py-2 border rounded-lg"
                                    >
                                        <option value="cash">Cash</option>
                                        <option value="qris">QRIS</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium mb-1">Kode Diskon (Opsional)</label>
                                    <input
                                        type="text"
                                        value={customerInfo.discount_code}
                                        onChange={(e) => setCustomerInfo({ ...customerInfo, discount_code: e.target.value })}
                                        className="w-full px-3 py-2 border rounded-lg"
                                        placeholder="Kode promo"
                                    />
                                </div>

                                <div className="border-t pt-4">
                                    <div className="flex justify-between text-xl font-bold mb-4">
                                        <span>Total Bayar:</span>
                                        <span className="text-primary-600">{formatRupiah(getTotalAmount())}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-3 mt-6">
                                <button
                                    onClick={() => setShowPaymentModal(false)}
                                    className="flex-1 py-3 border rounded-lg hover:bg-gray-50"
                                >
                                    Batal
                                </button>
                                <button
                                    onClick={handleSubmitOrder}
                                    className="flex-1 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-bold"
                                >
                                    Buat Order
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            {/* Receipt Modal (Print / WhatsApp) */}
            {showReceiptModal && receipt && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-xl w-full max-w-md p-6">
                        <h3 className="text-xl font-bold mb-2">✅ Order berhasil</h3>

                        <p className="text-sm text-gray-600 mb-3">
                            Nomor: <b>{receipt.order_no}</b>
                        </p>

                        {/* Input nomor WA (wajib jika kirim WA) */}
                        <div className="mb-4">
                            <label className="block text-sm font-medium mb-1">
                                Nomor WhatsApp (wajib untuk kirim)
                            </label>
                            <input
                                value={waPhone}
                                onChange={(e) => setWaPhone(e.target.value)}
                                className="w-full px-3 py-2 border rounded-lg"
                                placeholder="08xxxxxxxxxx"
                            />
                            <p className="text-xs text-gray-500 mt-1">
                                Format bebas, nanti otomatis jadi 62xxxx
                            </p>
                        </div>

                        <div className="space-y-3">
                            <button
                                onClick={() => {
                                    openAdvancedReceipt(receipt);
                                }}
                                className="w-full py-3 bg-primary-600 text-white rounded-lg font-bold hover:bg-primary-700"
                            >
                                🖨️ Cetak Struk
                            </button>
                            
                            {/* <button
                                onClick={() => setShowMaintenance(true)}
                                className="w-full py-3 bg-primary-600 text-white rounded-lg font-bold hover:bg-primary-700"
                            >
                                🖨️ Cetak Printer
                            </button>
                            {showMaintenance && (
                                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
                                    <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6 text-center animate-fade-in">
                                        <div className="text-4xl mb-3">🚧</div>

                                        <h2 className="text-lg font-semibold text-gray-800 mb-2">
                                            Fitur Sedang Dalam Perbaikan
                                        </h2>

                                        <p className="text-sm text-gray-600 mb-5">
                                            Mohon maaf, Cetak Nota Bisa Di Alihkan Kirim Ke WhatsApp. Terima Kasih.
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
                            <button
                                onClick={async () => {
                                    const success = await sendReceiptWhatsApp(receipt, waPhone);
                                    if (success) {
                                        setShowReceiptModal(false);
                                    }
                                }}
                                className="w-full py-3 bg-green-600 text-white rounded-lg font-bold hover:bg-green-700"
                                disabled={!String(waPhone || "").trim()}
                                title={!String(waPhone || "").trim() ? "Isi nomor WA dulu" : ""}
                            >
                                💬 Kirim via WhatsApp
                            </button>

                            <button
                                onClick={() => setShowReceiptModal(false)}
                                className="w-full py-3 bg-gray-200 rounded-lg font-bold hover:bg-gray-300"
                            >
                                Tutup
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* ✅ MOBILE ONLY: Sticky Bottom Bar */}
            <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t-2 border-gray-200 shadow-2xl z-40">
                {cart.length === 0 ? (
                    <div className="p-4 text-center">
                        <p className="text-gray-500 text-sm">Cart masih kosong</p>
                    </div>
                ) : (
                    <div className="p-4">
                        <button
                            onClick={() => setShowMobileCart(true)}
                            className="w-full bg-white border-2 border-primary-600 text-primary-600 rounded-lg py-3 mb-3 font-bold active:scale-95 transition flex items-center justify-between px-4"
                        >
                            <span className="flex items-center gap-2">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                                </svg>
                                <span>Lihat Cart ({cart.length} item)</span>
                            </span>
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                            </svg>
                        </button>

                        <div className="flex items-center justify-between mb-3">
                            <span className="text-gray-600 font-medium">Total:</span>
                            <span className="text-xl font-bold text-primary-600">{formatRupiah(getTotalAmount())}</span>
                        </div>

                        <button
                            onClick={() => setShowPaymentModal(true)}
                            className="w-full py-3 bg-primary-600 text-white rounded-lg font-bold active:scale-95 transition shadow-lg"
                        >
                            Proses Pembayaran
                        </button>
                    </div>
                )}
            </div>

            {/* ✅ MOBILE ONLY: Slide-up Cart Modal */}
            {showMobileCart && (
                <div
                    className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-50"
                    onClick={() => setShowMobileCart(false)}
                >
                    <div
                        className="fixed bottom-0 left-0 right-0 bg-white rounded-t-3xl shadow-2xl max-h-[80vh] overflow-hidden"
                        style={{ animation: 'slideUp 0.3s ease-out' }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex justify-center pt-3 pb-2">
                            <div className="w-12 h-1.5 bg-gray-300 rounded-full"></div>
                        </div>

                        <div className="px-4 pb-4">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-xl font-bold">Cart ({cart.length} item)</h2>
                                <button
                                    onClick={() => setShowMobileCart(false)}
                                    className="text-gray-500 p-2"
                                >
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>

                            <div className="space-y-3 overflow-y-auto max-h-[calc(80vh-180px)] mb-4">
                                {cart.map((item, index) => (
                                    <div key={index} className="border-b pb-3 last:border-b-0">
                                        <div className="flex justify-between items-start mb-2">
                                            <div className="flex-1">
                                                <p className="font-bold text-gray-900 text-sm">{item.product_name}</p>
                                                {item.modifiers.length > 0 && (
                                                    <p className="text-xs text-gray-600">
                                                        {item.modifiers.map(m => m.name).join(', ')}
                                                    </p>
                                                )}
                                            </div>
                                            <button
                                                onClick={() => removeFromCart(index)}
                                                className="text-red-600 hover:text-red-700 ml-2 p-1"
                                            >
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                </svg>
                                            </button>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => updateCartItemQty(index, item.quantity - 1)}
                                                    className="w-8 h-8 bg-gray-200 rounded-lg text-lg font-bold active:scale-95 transition"
                                                >
                                                    −
                                                </button>
                                                <span className="w-10 text-center font-semibold text-sm">{item.quantity}</span>
                                                <button
                                                    onClick={() => updateCartItemQty(index, item.quantity + 1)}
                                                    className="w-8 h-8 bg-primary-600 text-white rounded-lg text-lg font-bold active:scale-95 transition"
                                                >
                                                    +
                                                </button>
                                            </div>
                                            <p className="font-bold text-primary-600 text-sm">{formatRupiah(item.subtotal)}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="border-t pt-4">
                                <div className="flex justify-between text-xl font-bold mb-4">
                                    <span>Total:</span>
                                    <span className="text-primary-600">{formatRupiah(getTotalAmount())}</span>
                                </div>

                                <button
                                    onClick={() => {
                                        setShowMobileCart(false);
                                        setShowPaymentModal(true);
                                    }}
                                    className="w-full py-4 bg-primary-600 text-white rounded-lg font-bold active:scale-95 transition shadow-lg"
                                >
                                    Lanjut ke Pembayaran
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Advanced Receipt Component */}
            {showAdvancedReceipt && window.tempReceiptData && (
                <div style={{ zIndex: 60 }}>
                    <Receipt 
                        order={window.tempReceiptData.order}
                        items={window.tempReceiptData.items}
                        onClose={() => {
                            setShowAdvancedReceipt(false);
                            delete window.tempReceiptData;
                        }}
                    />
                </div>
            )}

        </AdminLayout>
    );
};
const styles = `
    @keyframes slideUp {
        from {
            transform: translateY(100%);
        }
        to {
            transform: translateY(0);
        }
    }
`;
if (typeof document !== 'undefined') {
    const styleSheet = document.createElement('style');
    styleSheet.textContent = styles;
    // Only inject if not already present
    if (!document.head.querySelector('[data-pos-mobile-styles]')) {
        styleSheet.setAttribute('data-pos-mobile-styles', '');
        document.head.appendChild(styleSheet);
    }
}

export default POSCounter;
