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
        discount_code: '',
    });

    // Customer type and search states
    const [customerType, setCustomerType] = useState('guest'); // 'guest' or 'existing'
    const [customerSearchQuery, setCustomerSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [selectedCustomer, setSelectedCustomer] = useState(null);
    const [isSearching, setIsSearching] = useState(false);

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

    // Search existing customers with auto-refresh
    const searchCustomers = async (query) => {
        if (!query.trim()) {
            setSearchResults([]);
            return;
        }

        setIsSearching(true);
        try {
            const response = await staffAPI.searchCustomers(query);
            const data = response.data;
            
            // Add realtime info to results
            const enhancedResults = (data.customers || []).map(customer => ({
                ...customer,
                isOnline: Math.random() > 0.7, // Simulate online status
                lastSeen: customer.last_order ? new Date(customer.last_order).toLocaleDateString('id-ID') : 'Tidak diketahui'
            }));
            
            setSearchResults(enhancedResults);
            
            // Show data source info
            if (data.source === 'mock') {
                console.log('Using mock data - will switch to real database when available');
            }
        } catch (error) {
            console.error('Error searching customers:', error);
            notify.error('Gagal mencari customer');
            setSearchResults([]);
        } finally {
            setIsSearching(false);
        }
    };

    // Auto-refresh customer data periodically for realtime feel
    useEffect(() => {
        if (customerSearchQuery.trim() && searchResults.length > 0) {
            const interval = setInterval(() => {
                // Silently refresh search results every 30 seconds
                searchCustomers(customerSearchQuery);
            }, 30000);

            return () => clearInterval(interval);
        }
    }, [customerSearchQuery, searchResults.length]);

    // Handle customer selection
    const handleSelectExistingCustomer = (customer) => {
        setSelectedCustomer(customer);
        setCustomerInfo({
            ...customerInfo,
            customer_name: customer.name,
            customer_phone: customer.phone,
        });
        setCustomerSearchQuery('');
        setSearchResults([]);
    };

    // Reset customer selection
    const resetCustomerSelection = () => {
        setCustomerType('guest');
        setSelectedCustomer(null);
        setCustomerSearchQuery('');
        setSearchResults([]);
        setCustomerInfo({
            ...customerInfo,
            customer_name: '',
            customer_phone: '',
        });
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

        // Tipe order
        let orderTypeText = '';
        if (order.type === 'dine_in') {
            orderTypeText = 'Dine In';
        } else if (order.type === 'delivery') {
            orderTypeText = 'Delivery';
        } else if (order.type === 'pickup') {
            orderTypeText = 'Pickup';
        }
        receipt += `Tipe       : ${orderTypeText}\n`;

        // Payment method
        let paymentText = '';
        if (order.payment_method === 'cash') {
            paymentText = 'Cash';
        } else if (order.payment_method === 'qris') {
            paymentText = 'QRIS';
        } else if (order.payment_method === 'transfer') {
            paymentText = 'Transfer';
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

            notify.success("Nota terkirim via WhatsApp.");
            return true;
        } catch (err) {
            console.error(err);
            notify.error("Gagal kirim WhatsApp (cek koneksi/backend).");
            return false;
        }
    };

    const formatRupiah = (amount) => {
        const numAmount = Number(amount);
        if (!Number.isFinite(numAmount)) {
            return 'Rp 0';
        }
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0,
        }).format(numAmount);
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
        let price = Number(selectedProduct.original_price || selectedProduct.price || 0);
        if (!Number.isFinite(price)) price = 0;

        Object.values(selectedModifiers).flat().forEach(modId => {
            const modifier = menu.modifiers.find(m => m.id === modId);
            if (modifier) {
                const delta = Number(modifier.price_delta || 0);
                if (Number.isFinite(delta)) {
                    price += delta;
                }
            }
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
                price_delta: m.price_delta || 0, // Jangan konversi ke Number dulu
                group_id: group.id,
                group_name: group.name,
            }));
        });

        const productPrice = Number(selectedProduct.original_price || selectedProduct.price || 0);
        const subtotal = calculateItemSubtotal();
        
        const cartItem = {
            product_id: selectedProduct.id,
            product_name: selectedProduct.name,
            product_price: productPrice,
            quantity,
            modifiers,
            subtotal: Number.isFinite(subtotal) ? subtotal : 0
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
            const modifiersTotal = mods.reduce((sum, m) => {
                const delta = Number(m?.price_delta || 0);
                return sum + (Number.isFinite(delta) ? delta : 0);
            }, 0);

            const basePrice = Number(item.product_price || 0) + modifiersTotal;
            const validBasePrice = Number.isFinite(basePrice) ? basePrice : 0;

            item.quantity = qty;
            item.subtotal = validBasePrice * qty;

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
                notes = customerInfo.delivery_address || null;
            }

            const orderData = {
                customer_name: customerInfo.customer_name,
                customer_phone: customerInfo.customer_phone,
                customer_id: selectedCustomer ? selectedCustomer.id : null, // Link to existing customer
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
                discount_code: '',
            });
            resetCustomerSelection();
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
                <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-6">POS Kasir</h1>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Menu Section - 2 columns */}
                    <div className="lg:col-span-2">
                        {/* Search & Category Filter */}
                        <div className="bg-white rounded-lg shadow-md p-4 mb-4">
                            <input
                                type="text"
                                placeholder="Cari produk..."
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
                <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-3 z-50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[95vh] overflow-hidden">
                        {/* Header */}
                        <div className="bg-gradient-to-r from-primary-600 to-primary-700 px-6 py-4 text-white">
                            <div className="flex justify-between items-center">
                                <div>
                                    <h2 className="text-xl font-bold">Info Pelanggan & Pembayaran</h2>
                                    <p className="text-primary-100 text-sm mt-1">Lengkapi data untuk proses order</p>
                                </div>
                                <button
                                    onClick={() => setShowPaymentModal(false)}
                                    className="text-white hover:text-primary-200 p-1 hover:bg-primary-800 rounded-lg transition-colors"
                                >
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                        </div>

                        {/* Content */}
                        <div className="p-6 overflow-y-auto max-h-[calc(95vh-180px)]">
                            <div className="space-y-6">
                                {/* Customer Type Selection */}
                                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-5 border border-blue-100">
                                    <label className="block text-sm font-semibold text-blue-800 mb-4 flex items-center space-x-2">
                                        <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                                        </svg>
                                        <span>Pilih Tipe Customer</span>
                                    </label>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setCustomerType('guest');
                                                resetCustomerSelection();
                                            }}
                                            className={`group relative overflow-hidden px-5 py-4 rounded-xl border-2 transition-all duration-300 ${
                                                customerType === 'guest'
                                                    ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white border-green-500 shadow-lg transform scale-105'
                                                    : 'bg-white text-gray-700 border-gray-200 hover:border-green-300 hover:bg-green-50 hover:shadow-md'
                                            }`}
                                        >
                                            {customerType === 'guest' && (
                                                <div className="absolute top-1 right-1 bg-white bg-opacity-20 backdrop-blur-sm rounded-full px-2 py-1">
                                                    <span className="text-xs font-bold text-white">AKTIF</span>
                                                </div>
                                            )}
                                            <div className="flex flex-col items-center text-center space-y-2">
                                                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                                                    customerType === 'guest' ? 'bg-white bg-opacity-20' : 'bg-green-100'
                                                }`}>
                                                    <svg className={`w-6 h-6 ${customerType === 'guest' ? 'text-white' : 'text-green-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                                    </svg>
                                                </div>
                                                <div>
                                                    <div className="font-bold text-base">Customer Baru</div>
                                                    <div className={`text-xs ${customerType === 'guest' ? 'text-white text-opacity-90' : 'text-gray-500'}`}>
                                                        Pembelian tanpa registrasi
                                                    </div>
                                                </div>
                                            </div>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setCustomerType('existing')}
                                            className={`group relative overflow-hidden px-5 py-4 rounded-xl border-2 transition-all duration-300 ${
                                                customerType === 'existing'
                                                    ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white border-blue-500 shadow-lg transform scale-105'
                                                    : 'bg-white text-gray-700 border-gray-200 hover:border-blue-300 hover:bg-blue-50 hover:shadow-md'
                                            }`}
                                        >
                                            {customerType === 'existing' && (
                                                <div className="absolute top-1 right-1 bg-white bg-opacity-20 backdrop-blur-sm rounded-full px-2 py-1">
                                                    <span className="text-xs font-bold text-white">AKTIF</span>
                                                </div>
                                            )}
                                            <div className="flex flex-col items-center text-center space-y-2">
                                                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                                                    customerType === 'existing' ? 'bg-white bg-opacity-20' : 'bg-blue-100'
                                                }`}>
                                                    <svg className={`w-6 h-6 ${customerType === 'existing' ? 'text-white' : 'text-blue-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                                                    </svg>
                                                </div>
                                                <div>
                                                    <div className="font-bold text-base">Customer Terdaftar</div>
                                                    <div className={`text-xs ${customerType === 'existing' ? 'text-white text-opacity-90' : 'text-gray-500'}`}>
                                                        Akun member dengan poin
                                                    </div>
                                                </div>
                                            </div>
                                        </button>
                                    </div>
                                </div>

                                {/* Existing Customer Search */}
                                {customerType === 'existing' && (
                                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                                        <label className="block text-sm font-semibold text-blue-800 mb-3">
                                            Cari Customer {selectedCustomer && <span className="text-green-600">✓</span>}
                                        </label>
                                        {selectedCustomer ? (
                                            <div className="bg-gradient-to-r from-green-50 to-blue-50 border-2 border-green-200 rounded-xl p-4">
                                                <div className="flex justify-between items-start">
                                                    <div className="flex space-x-3">
                                                        {selectedCustomer.avatar ? (
                                                            <img 
                                                                src={selectedCustomer.avatar} 
                                                                alt={selectedCustomer.name}
                                                                className="w-12 h-12 rounded-full border-2 border-white shadow-md"
                                                            />
                                                        ) : (
                                                            <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-primary-600 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-md">
                                                                {selectedCustomer.name.charAt(0).toUpperCase()}
                                                            </div>
                                                        )}
                                                        <div>
                                                            <p className="font-bold text-green-800 text-lg">{selectedCustomer.name}</p>
                                                            <p className="text-sm text-green-600 flex items-center space-x-1">
                                                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                                                    <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/>
                                                                </svg>
                                                                <span>{selectedCustomer.phone}</span>
                                                            </p>
                                                            <p className="text-sm text-green-600 flex items-center space-x-1">
                                                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                                                    <path d="M12 2C13.1 2 14 2.9 14 4C14 5.1 13.1 6 12 6C10.9 6 10 5.1 10 4C10 2.9 10.9 2 12 2ZM21 9V7L15 1H5C3.89 1 3 1.89 3 3V19C3 20.1 3.9 21 5 21H11V19H5V3H15V9H21Z"/>
                                                                </svg>
                                                                <span>{selectedCustomer.email}</span>
                                                            </p>
                                                            {selectedCustomer.order_count > 0 && (
                                                                <div className="flex items-center space-x-2 mt-2">
                                                                    <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full font-medium">
                                                                        {selectedCustomer.order_count} orders
                                                                    </span>
                                                                    {selectedCustomer.order_count >= 10 && (
                                                                        <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded-full font-medium">
                                                                            VIP
                                                                        </span>
                                                                    )}
                                                                    {selectedCustomer.isOnline && (
                                                                        <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full font-medium flex items-center space-x-1">
                                                                            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                                                                            <span>Online</span>
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <button
                                                        onClick={resetCustomerSelection}
                                                        className="text-red-500 hover:text-red-700 hover:bg-red-100 p-2 rounded-lg transition-colors"
                                                    >
                                                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                                            <path d="M6 18L18 6M6 6l12 12"/>
                                                        </svg>
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="relative">
                                                <div className="relative">
                                                    <input
                                                        type="text"
                                                        value={customerSearchQuery}
                                                        onChange={(e) => {
                                                            setCustomerSearchQuery(e.target.value);
                                                            searchCustomers(e.target.value);
                                                        }}
                                                        className="w-full px-4 py-3 pl-10 pr-10 border-2 border-blue-200 rounded-xl focus:border-primary-500 focus:ring-0 transition-colors"
                                                        placeholder="Ketik nama, phone, atau email..."
                                                    />
                                                    <svg className="absolute left-3 top-3.5 w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                                    </svg>
                                                    {isSearching && (
                                                        <div className="absolute right-3 top-3.5">
                                                            <div className="w-5 h-5 border-2 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
                                                        </div>
                                                    )}
                                                </div>
                                                
                                                {/* Search Results */}
                                                {searchResults.length > 0 && (
                                                    <div className="absolute z-10 w-full mt-2 bg-white border-2 border-blue-200 rounded-xl shadow-xl max-h-64 overflow-y-auto">
                                                        {searchResults.map((customer) => (
                                                            <button
                                                                key={customer.id}
                                                                onClick={() => handleSelectExistingCustomer(customer)}
                                                                className="w-full p-4 text-left hover:bg-blue-50 border-b border-blue-100 last:border-b-0 first:rounded-t-xl last:rounded-b-xl transition-colors"
                                                            >
                                                                <div className="flex justify-between items-start">
                                                                    <div className="flex space-x-3 flex-1">
                                                                        {customer.avatar ? (
                                                                            <img 
                                                                                src={customer.avatar} 
                                                                                alt={customer.name}
                                                                                className="w-10 h-10 rounded-full border border-gray-200"
                                                                            />
                                                                        ) : (
                                                                            <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                                                                                {customer.name.charAt(0).toUpperCase()}
                                                                            </div>
                                                                        )}
                                                                        <div className="flex-1 min-w-0">
                                                                            <div className="flex items-center space-x-2">
                                                                                <p className="font-semibold text-gray-900 truncate">{customer.name}</p>
                                                                                {customer.isOnline && (
                                                                                    <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" title="Online sekarang"></span>
                                                                                )}
                                                                            </div>
                                                                            <p className="text-sm text-gray-600 truncate">{customer.phone}</p>
                                                                            <p className="text-sm text-gray-500 truncate">{customer.email}</p>
                                                                        </div>
                                                                    </div>
                                                                    <div className="flex flex-col items-end space-y-1">
                                                                        {customer.order_count >= 10 && (
                                                                            <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full font-medium">
                                                                                VIP
                                                                            </span>
                                                                        )}
                                                                        {customer.order_count > 0 && (
                                                                            <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                                                                                {customer.order_count} orders
                                                                            </span>
                                                                        )}
                                                                        {customer.isOnline && (
                                                                            <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                                                                                Online
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </button>
                                                        ))}
                                                    </div>
                                                )}
                                                
                                                {customerSearchQuery.trim() && !isSearching && searchResults.length === 0 && (
                                                    <div className="absolute z-10 w-full mt-2 bg-white border-2 border-orange-200 rounded-xl shadow-lg p-4">
                                                        <div className="text-center">
                                                            <p className="text-gray-600 text-sm font-medium">Customer tidak ditemukan</p>
                                                            <p className="text-gray-400 text-xs mt-1">
                                                                Customer mungkin belum terdaftar di website
                                                            </p>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}
                                {/* Customer Info Form */}
                                {(customerType === 'guest' || !selectedCustomer) && (
                                    <div className="bg-indigo-50 rounded-xl p-4 border border-indigo-200">
                                        <div className="space-y-4">
                                            <div>
                                                <label className="block text-sm font-semibold text-indigo-800 mb-2 flex items-center space-x-2">
                                                    <span className="text-lg">📝</span>
                                                    <span>Nama Pelanggan {customerType === 'guest' && '*'}</span>
                                                </label>
                                                <input
                                                    type="text"
                                                    value={customerInfo.customer_name}
                                                    onChange={(e) => setCustomerInfo({ ...customerInfo, customer_name: e.target.value })}
                                                    className="w-full px-4 py-3 border-2 border-indigo-200 rounded-xl focus:border-primary-500 focus:ring-0 transition-colors disabled:bg-gray-100 disabled:text-gray-600"
                                                    placeholder="Masukkan nama pelanggan..."
                                                    disabled={customerType === 'existing' && selectedCustomer}
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-semibold text-indigo-800 mb-2 flex items-center space-x-2">
                                                    <span className="text-lg">📱</span>
                                                    <span>Nomor HP {customerType === 'guest' ? '(Opsional)' : '*'}</span>
                                                </label>
                                                <input
                                                    type="text"
                                                    value={customerInfo.customer_phone}
                                                    onChange={(e) => setCustomerInfo({ ...customerInfo, customer_phone: e.target.value })}
                                                    className="w-full px-4 py-3 border-2 border-indigo-200 rounded-xl focus:border-primary-500 focus:ring-0 transition-colors disabled:bg-gray-100 disabled:text-gray-600"
                                                    placeholder="08xxxxxxxxxx"
                                                    disabled={customerType === 'existing' && selectedCustomer}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Customer Type Indicator */}
                                {selectedCustomer && (
                                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl p-4">
                                        <div className="flex items-center space-x-3">
                                            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
                                                <span className="text-white text-lg">👤</span>
                                            </div>
                                            <div>
                                                <span className="text-blue-800 font-semibold text-lg">Customer Terdaftar</span>
                                                <p className="text-sm text-blue-600 mt-1">
                                                    Order akan terhubung dengan akun customer dan mendapat loyalty points
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Order Type */}
                                <div className="bg-amber-50 rounded-xl p-4 border border-amber-200">
                                    <label className="block text-sm font-semibold text-amber-800 mb-3 flex items-center space-x-2">
                                        <span className="text-lg">🍽️</span>
                                        <span>Tipe Order</span>
                                    </label>
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                        <button
                                            type="button"
                                            onClick={() => setCustomerInfo({ ...customerInfo, order_type: 'dine_in' })}
                                            className={`group px-4 py-3 rounded-xl border-2 text-sm font-medium transition-all duration-200 ${
                                                customerInfo.order_type === 'dine_in'
                                                    ? 'bg-amber-600 text-white border-amber-600 shadow-lg'
                                                    : 'bg-white text-amber-700 border-amber-300 hover:border-amber-500 hover:bg-amber-100'
                                            }`}
                                        >
                                            <div className="flex items-center justify-center space-x-2">
                                                <span className="text-lg">🏪</span>
                                                <span>Dine In</span>
                                            </div>
                                            <div className="text-xs opacity-75">Makan Di Tempat</div>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setCustomerInfo({ ...customerInfo, order_type: 'pickup' })}
                                            className={`group px-4 py-3 rounded-xl border-2 text-sm font-medium transition-all duration-200 ${
                                                customerInfo.order_type === 'pickup'
                                                    ? 'bg-amber-600 text-white border-amber-600 shadow-lg'
                                                    : 'bg-white text-amber-700 border-amber-300 hover:border-amber-500 hover:bg-amber-100'
                                            }`}
                                        >
                                            <div className="flex items-center justify-center space-x-2">
                                                <span className="text-lg">📦</span>
                                                <span>Pickup</span>
                                            </div>
                                            <div className="text-xs opacity-75">Ambil Sendiri</div>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setCustomerInfo({ ...customerInfo, order_type: 'delivery' })}
                                            className={`group px-4 py-3 rounded-xl border-2 text-sm font-medium transition-all duration-200 ${
                                                customerInfo.order_type === 'delivery'
                                                    ? 'bg-amber-600 text-white border-amber-600 shadow-lg'
                                                    : 'bg-white text-amber-700 border-amber-300 hover:border-amber-500 hover:bg-amber-100'
                                            }`}
                                        >
                                            <div className="flex items-center justify-center space-x-2">
                                                <span className="text-lg">🚚</span>
                                                <span>Delivery</span>
                                            </div>
                                            <div className="text-xs opacity-75">Antar Langsung</div>
                                        </button>
                                    </div>
                                </div>

                                {/* Delivery Info (if delivery selected) */}
                                {customerInfo.order_type === 'delivery' && (
                                    <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
                                        <div className="space-y-4">
                                            <div>
                                                <label className="block text-sm font-semibold text-blue-800 mb-2 flex items-center space-x-2">
                                                    <span className="text-lg">📍</span>
                                                    <span>Alamat Pengiriman *</span>
                                                </label>
                                                <textarea
                                                    value={customerInfo.delivery_address}
                                                    onChange={(e) => setCustomerInfo({ ...customerInfo, delivery_address: e.target.value })}
                                                    className="w-full px-4 py-3 border-2 border-blue-200 rounded-xl focus:border-primary-500 focus:ring-0 transition-colors resize-none"
                                                    rows="3"
                                                    placeholder="Masukkan alamat lengkap untuk pengiriman..."
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Payment Method */}
                                <div className="bg-green-50 rounded-xl p-4 border border-green-200">
                                    <label className="block text-sm font-semibold text-green-800 mb-3 flex items-center space-x-2">
                                        <span className="text-lg">💳</span>
                                        <span>Metode Pembayaran</span>
                                    </label>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <button
                                            type="button"
                                            onClick={() => setCustomerInfo({ ...customerInfo, payment_method: 'cash' })}
                                            className={`group px-4 py-3 rounded-xl border-2 text-sm font-medium transition-all duration-200 ${
                                                customerInfo.payment_method === 'cash'
                                                    ? 'bg-green-600 text-white border-green-600 shadow-lg'
                                                    : 'bg-white text-green-700 border-green-300 hover:border-green-500 hover:bg-green-100'
                                            }`}
                                        >
                                            <div className="flex items-center justify-center space-x-2">
                                                <span className="text-lg">💵</span>
                                                <span>Cash</span>
                                            </div>
                                            <div className="text-xs opacity-75">Pembayaran Tunai</div>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setCustomerInfo({ ...customerInfo, payment_method: 'qris' })}
                                            className={`group px-4 py-3 rounded-xl border-2 text-sm font-medium transition-all duration-200 ${
                                                customerInfo.payment_method === 'qris'
                                                    ? 'bg-green-600 text-white border-green-600 shadow-lg'
                                                    : 'bg-white text-green-700 border-green-300 hover:border-green-500 hover:bg-green-100'
                                            }`}
                                        >
                                            <div className="flex items-center justify-center space-x-2">
                                                <span className="text-lg">📱</span>
                                                <span>QRIS</span>
                                            </div>
                                            <div className="text-xs opacity-75">Scan QR Code</div>
                                        </button>
                                    </div>
                                </div>

                                {/* Discount Code */}
                                <div className="bg-orange-50 rounded-xl p-4 border border-orange-200">
                                    <label className="block text-sm font-semibold text-orange-800 mb-2">
                                        <span>Kode Diskon (Opsional)</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={customerInfo.discount_code}
                                        onChange={(e) => setCustomerInfo({ ...customerInfo, discount_code: e.target.value })}
                                        className="w-full px-4 py-3 border-2 border-orange-200 rounded-xl focus:border-primary-500 focus:ring-0 transition-colors"
                                        placeholder="Masukkan kode promo atau voucher..."
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="bg-gray-50 border-t px-6 py-4 rounded-b-2xl">
                            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-4 sm:space-y-0">
                                {/* Total */}
                                <div className="text-center sm:text-left">
                                    <p className="text-sm text-gray-600 mb-1">Total Bayar:</p>
                                    <p className="text-2xl font-bold text-primary-600">{formatRupiah(getTotalAmount())}</p>
                                </div>

                                {/* Action Buttons */}
                                <div className="flex space-x-3">
                                    <button
                                        onClick={() => setShowPaymentModal(false)}
                                        className="flex-1 sm:flex-none px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50 hover:border-gray-400 transition-colors"
                                    >
                                        Batal
                                    </button>
                                    <button
                                        onClick={handleSubmitOrder}
                                        className="flex-1 sm:flex-none px-6 py-3 bg-gradient-to-r from-primary-600 to-primary-700 text-white rounded-xl font-bold hover:from-primary-700 hover:to-primary-800 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
                                    >
                                        <span>Proses Order</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Receipt Modal (Print / WhatsApp) */}
            {showReceiptModal && receipt && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-xl w-full max-w-md p-6">
                        <h3 className="text-xl font-bold mb-2">Order berhasil</h3>

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
            <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t-2 border-gray-200 shadow-2xl z-40 backdrop-blur-md bg-opacity-95">
                {cart.length === 0 ? (
                    <div className="p-3 text-center">
                        <div className="flex items-center justify-center space-x-2 mb-1">
                            <span className="text-xl">🛒</span>
                            <p className="text-gray-500 text-sm font-medium">Keranjang masih kosong</p>
                        </div>
                        <p className="text-xs text-gray-400">Pilih menu untuk mulai belanja</p>
                    </div>
                ) : (
                    <div className="p-3">
                        {/* Cart Summary Button */}
                        <button
                            onClick={() => setShowMobileCart(true)}
                            className="w-full bg-gradient-to-r from-gray-50 to-gray-100 border-2 border-primary-300 text-primary-700 rounded-lg py-2 mb-2 font-semibold active:scale-95 transition-all duration-200 flex items-center justify-between px-3 hover:from-primary-50 hover:to-primary-100 hover:border-primary-400"
                        >
                            <div className="flex items-center space-x-2">
                                <div className="w-8 h-8 bg-primary-600 rounded-full flex items-center justify-center relative">
                                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                                    </svg>
                                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
                                        {cart.length}
                                    </span>
                                </div>
                                <div className="text-left">
                                    <p className="font-semibold text-sm">Lihat Keranjang</p>
                                    <p className="text-xs text-primary-600">{cart.length} item dalam keranjang</p>
                                </div>
                            </div>
                            <div className="flex items-center space-x-1">
                                <span className="text-xs font-medium">Buka</span>
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                                </svg>
                            </div>
                        </button>

                        {/* Total and Checkout */}
                        <div className="bg-gradient-to-r from-primary-50 to-primary-100 rounded-lg p-3 mb-2 border border-primary-200">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-xs text-primary-700 font-medium mb-1">Total Pembayaran</p>
                                    <p className="text-lg font-bold text-primary-600">{formatRupiah(getTotalAmount())}</p>
                                </div>
                                <div className="text-right">
                                    <div className="text-xs text-primary-600 space-y-1">
                                        <div className="flex items-center space-x-1">
                                            <span>🍽️</span>
                                            <span>{cart.length} item</span>
                                        </div>
                                        <div className="flex items-center space-x-1">
                                            <span>Siap checkout</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <button
                            onClick={() => setShowPaymentModal(true)}
                            className="w-full py-3 bg-gradient-to-r from-primary-600 to-primary-700 text-white rounded-lg font-bold active:scale-95 transition-all duration-200 shadow-lg hover:shadow-xl hover:from-primary-700 hover:to-primary-800"
                        >
                            <span>Proses Pembayaran</span>
                        </button>
                    </div>
                )}
            </div>

            {/* ✅ MOBILE ONLY: Slide-up Cart Modal */}
            {showMobileCart && (
                <div
                    className="lg:hidden fixed inset-0 bg-black bg-opacity-60 z-50 backdrop-blur-sm"
                    onClick={() => setShowMobileCart(false)}
                >
                    <div
                        className="fixed bottom-0 left-0 right-0 bg-white rounded-t-3xl shadow-2xl max-h-[85vh] overflow-hidden"
                        style={{ animation: 'slideUp 0.3s ease-out' }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Drag Indicator */}
                        <div className="flex justify-center pt-3 pb-2">
                            <div className="w-12 h-1.5 bg-gray-300 rounded-full"></div>
                        </div>

                        {/* Header */}
                        <div className="bg-gradient-to-r from-primary-600 to-primary-700 px-4 py-4 text-white">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-2">
                                    <span className="text-2xl">🛒</span>
                                    <div>
                                        <h2 className="text-xl font-bold">Keranjang Belanja</h2>
                                        <p className="text-primary-100 text-sm">{cart.length} item dalam keranjang</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setShowMobileCart(false)}
                                    className="text-white hover:text-primary-200 p-1 hover:bg-primary-800 rounded-lg transition-colors"
                                >
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                        </div>

                        {/* Cart Items */}
                        <div className="px-4 py-4">
                            {cart.length === 0 ? (
                                <div className="text-center py-12">
                                    <div className="text-6xl mb-4">🛒</div>
                                    <p className="text-gray-500 font-medium">Keranjang masih kosong</p>
                                    <p className="text-sm text-gray-400 mt-1">Yuk pilih menu favorit kamu!</p>
                                </div>
                            ) : (
                                <>
                                    <div className="space-y-4 overflow-y-auto max-h-[calc(85vh-240px)] mb-4">
                                        {cart.map((item, index) => (
                                            <div key={index} className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                                                <div className="flex justify-between items-start mb-3">
                                                    <div className="flex-1 pr-3">
                                                        <p className="font-bold text-gray-900 text-base leading-tight">{item.product_name}</p>
                                                        {item.modifiers.length > 0 && (
                                                            <div className="mt-2 space-y-1">
                                                                {item.modifiers.map((m, idx) => (
                                                                    <div key={idx} className="flex items-center space-x-2">
                                                                        <span className="w-2 h-2 bg-primary-500 rounded-full"></span>
                                                                        <span className="text-xs text-gray-600">{m.name}</span>
                                                                        <span className="text-xs text-gray-500">+{formatRupiah(m.price_delta)}</span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <button
                                                        onClick={() => removeFromCart(index)}
                                                        className="text-red-500 hover:text-red-700 hover:bg-red-100 p-2 rounded-lg transition-colors"
                                                    >
                                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                        </svg>
                                                    </button>
                                                </div>
                                                
                                                <div className="flex justify-between items-center">
                                                    {/* Quantity Controls */}
                                                    <div className="flex items-center bg-white rounded-xl border border-gray-300 overflow-hidden">
                                                        <button
                                                            onClick={() => updateCartItemQty(index, item.quantity - 1)}
                                                            className="w-10 h-10 bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold active:scale-95 transition-all duration-200"
                                                        >
                                                            −
                                                        </button>
                                                        <span className="w-12 text-center font-bold text-gray-900">{item.quantity}</span>
                                                        <button
                                                            onClick={() => updateCartItemQty(index, item.quantity + 1)}
                                                            className="w-10 h-10 bg-primary-600 hover:bg-primary-700 text-white font-bold active:scale-95 transition-all duration-200"
                                                        >
                                                            +
                                                        </button>
                                                    </div>
                                                    
                                                    {/* Price */}
                                                    <div className="text-right">
                                                        <p className="text-lg font-bold text-primary-600">{formatRupiah(item.subtotal)}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Total & Checkout */}
                                    <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl p-4 border border-gray-200">
                                        <div className="flex justify-between items-center mb-4">
                                            <div>
                                                <p className="text-sm text-gray-600 mb-1">Total Pembayaran</p>
                                                <p className="text-2xl font-bold text-primary-600">{formatRupiah(getTotalAmount())}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-sm text-gray-600">{cart.length} item</p>
                                                <p className="text-xs text-gray-500">Siap untuk checkout</p>
                                            </div>
                                        </div>

                                        <button
                                            onClick={() => {
                                                setShowMobileCart(false);
                                                setShowPaymentModal(true);
                                            }}
                                            className="w-full py-4 bg-gradient-to-r from-primary-600 to-primary-700 text-white rounded-xl font-bold active:scale-95 transition-all duration-200 shadow-lg hover:shadow-xl hover:from-primary-700 hover:to-primary-800"
                                        >
                                            <span>Lanjut ke Pembayaran</span>
                                        </button>
                                    </div>
                                </>
                            )}
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
