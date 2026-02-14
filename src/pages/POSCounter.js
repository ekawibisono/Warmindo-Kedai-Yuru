import React, { useState, useEffect, useMemo, useCallback, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '../components/admin/AdminLayout';
import Receipt from '../components/admin/Receipt';
import { publicAPI, staffAPI } from '../services/api';
import { notify } from '../components/common/Toast';

// Optimized Product Card Component dengan lazy loading
const ProductCard = memo(({ product, formatRupiah, onSelectProduct }) => {
    const [imageLoaded, setImageLoaded] = useState(false);
    const [imageError, setImageError] = useState(false);
    
    // Memoized price untuk avoid recalculation
    const productPrice = useMemo(() => 
        formatRupiah(product.original_price || product.price), 
        [product.original_price, product.price, formatRupiah]
    );
    
    const soldBadge = product.total_sold > 0;
    
    return (
        <button
            type="button"
            onClick={() => onSelectProduct(product)}
            className="group bg-white border border-gray-100 rounded-xl shadow-sm hover:shadow-lg transition-shadow text-left flex flex-col overflow-hidden text-sm"
        >
            <div className="relative">
                {product.image_url && !imageError ? (
                    <>
                        {!imageLoaded && (
                            <div className="w-full h-28 sm:h-32 bg-gray-200 animate-pulse"></div>
                        )}
                        <img
                            src={product.image_url}
                            alt={product.name}
                            loading="lazy"
                            className={`w-full h-28 sm:h-32 object-cover transition-opacity ${
                                imageLoaded ? 'opacity-100' : 'opacity-0 absolute'
                            }`}
                            onLoad={() => setImageLoaded(true)}
                            onError={() => setImageError(true)}
                        />
                    </>
                ) : (
                    <div className="w-full h-28 sm:h-32 bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                        <div className="text-2xl">🍽️</div>
                    </div>
                )}
                {soldBadge && (
                    <div className="absolute top-1 left-1 bg-green-500 text-white text-[8px] px-1.5 py-0.5 rounded-md font-medium">
                        {product.total_sold}
                    </div>
                )}
            </div>
            <div className="flex-1 flex flex-col p-2 sm:p-3">
                <h3 className="font-semibold text-gray-900 text-xs sm:text-sm leading-tight mb-1">
                    {product.name}
                </h3>
                <div className="text-primary-600 font-bold text-sm mb-auto">
                    {productPrice}
                </div>
                {product.description && (
                    <p className="text-[10px] sm:text-xs text-gray-500 mt-1 line-clamp-2">
                        {product.description}
                    </p>
                )}
            </div>
        </button>
    );
});

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
    const [selectedCategory, setSelectedCategory] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [productsToShow, setProductsToShow] = useState(8); // Reduced for better performance
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

    // Debounce hook untuk search optimization
    const useDebounce = (value, delay) => {
        const [debouncedValue, setDebouncedValue] = useState(value);
        useEffect(() => {
            const handler = setTimeout(() => setDebouncedValue(value), delay);
            return () => clearTimeout(handler);
        }, [value, delay]);
        return debouncedValue;
    };

    const debouncedSearchQuery = useDebounce(customerSearchQuery, 500);

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

    // Search existing customers dengan debouncing dan optimization
    const searchCustomers = useCallback(async (query) => {
        if (!query.trim()) {
            setSearchResults([]);
            return;
        }

        setIsSearching(true);
        try {
            const response = await staffAPI.searchCustomers(query);
            const data = response.data;
            
            // Optimize data processing dengan caching
            const enhancedResults = (data.customers || []).map((customer, index) => ({
                ...customer,
                id: customer.id || `customer-${index}`, // Ensure unique ID
                isOnline: Math.random() > 0.7, // Simulate online status
                lastSeen: customer.last_order ? new Date(customer.last_order).toLocaleDateString('id-ID') : 'Tidak diketahui'
            }));
            
            setSearchResults(enhancedResults);
            
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
    }, []);

    // Gunakan debounced search query
    useEffect(() => {
        searchCustomers(debouncedSearchQuery);
    }, [debouncedSearchQuery, searchCustomers]);

    // Handle customer selection dengan useCallback
    const handleSelectExistingCustomer = useCallback((customer) => {
        setSelectedCustomer(customer);
        setCustomerInfo(prev => ({
            ...prev,
            customer_name: customer.name,
            customer_phone: customer.phone,
        }));
        setCustomerSearchQuery('');
        setSearchResults([]);
    }, []);

    // Optimized customer search dengan memoization
    const CustomerSearchResults = useMemo(() => {
        if (!customerSearchQuery.trim() || isSearching) return null;
        
        // Limit results untuk performance (maksimal 5 results)
        const limitedResults = searchResults.slice(0, 5);
        
        return limitedResults.map((customer, index) => (
            <button
                key={`customer-${customer.id || index}`}
                type="button"
                onClick={() => {
                    handleSelectExistingCustomer(customer);
                    notify.success(`Customer ${customer.name} dipilih`);
                }}
                className="w-full p-3 text-left hover:bg-blue-50 rounded-lg border-b border-blue-100 last:border-b-0"
            >
                <div className="flex items-center space-x-3">
                    {customer.profile_picture ? (
                        <img
                            src={customer.profile_picture}
                            alt={customer.name}
                            className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                            loading="lazy"
                        />
                    ) : (
                        <div className="w-8 h-8 bg-primary-500 rounded-full flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
                            {customer.name.charAt(0).toUpperCase()}
                        </div>
                    )}
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-1">
                            <p className="font-semibold text-gray-900 truncate text-sm">{customer.name}</p>
                            {customer.isOnline && (
                                <span className="w-2 h-2 bg-green-500 rounded-full flex-shrink-0"></span>
                            )}
                        </div>
                        <p className="text-xs text-gray-600 truncate">📱 {customer.phone}</p>
                        <p className="text-xs text-gray-500 truncate">📧 {customer.email}</p>
                    </div>
                </div>
            </button>
        ));
    }, [customerSearchQuery, isSearching, searchResults, handleSelectExistingCustomer]);
    
    // Reset customer selection dengan useCallback
    const resetCustomerSelection = useCallback(() => {
        setCustomerType('guest');
        setSelectedCustomer(null);
        setCustomerSearchQuery('');
        setSearchResults([]);
        setCustomerInfo(prev => ({
            ...prev,
            customer_name: '',
            customer_phone: '',
        }));
    }, []);

    // Format rupiah function
    const formatRupiah = useCallback((amount) => {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(amount);
    }, []);

    // Optimized cart item component 
    const CartItem = useCallback(({ item, index, onRemove, onUpdateQty }) => {
        // Use item.subtotal directly without useMemo to avoid hooks in callback
        const itemSubtotal = item.subtotal;
        
        return (
            <div className="border border-gray-100 rounded-2xl p-4 shadow-sm">
                <div className="flex justify-between items-start gap-4">
                    <div className="flex-1">
                        <p className="font-semibold text-gray-900">{item.product_name}</p>
                        {item.modifiers.length > 0 && (
                            <div className="mt-1 space-y-1 text-xs text-gray-600">
                                {item.modifiers.map((m, idx) => (
                                    <div key={`mod-${idx}`} className="flex items-center gap-2">
                                        <span className="w-1.5 h-1.5 rounded-full bg-primary-500"></span>
                                        <span>{m.name}</span>
                                        {Number(m.price_delta || 0) > 0 && (
                                            <span className="text-primary-600 font-semibold">+{formatRupiah(Number(m.price_delta || 0))}</span>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                    <button
                        onClick={() => onRemove(index)}
                        className="text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg p-1.5 transition-colors"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
                <div className="mt-3 flex items-center justify-between">
                    <div className="flex items-center bg-gray-50 rounded-xl overflow-hidden border border-gray-200">
                        <button
                            onClick={() => onUpdateQty(index, item.quantity - 1)}
                            className="w-10 h-10 text-lg font-semibold text-gray-600 hover:bg-gray-100"
                        >
                            −
                        </button>
                        <span className="w-12 text-center font-bold">{item.quantity}</span>
                        <button
                            onClick={() => onUpdateQty(index, item.quantity + 1)}
                            className="w-10 h-10 text-lg font-semibold text-white bg-primary-600 hover:bg-primary-700"
                        >
                            +
                        </button>
                    </div>
                    <p className="text-lg font-bold text-primary-600">{formatRupiah(itemSubtotal)}</p>
                </div>
            </div>
        );
    }, [formatRupiah]);
    
    const API_BASE_URL = process.env.REACT_APP_API_URL;
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
        } else if (order.type === 'takeaway') {
            orderTypeText = 'TakeAway';
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
        receipt += `*DETAIL PESANAN*\n`;
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
            receipt += `\nCatatan:\n${order.notes}\n`;
        }

        receipt += `\n`;
        receipt += `═══════════════════════\n`;
        receipt += `   *Terima Kasih!*\n`;
        receipt += `   Selamat Menikmati\n`;
        receipt += `═══════════════════════\n`;

        return receipt;
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

    const getProductModifierGroups = useCallback((productId) => {
        const mappings = (menu.product_modifier_groups || [])
            .filter((pmg) => pmg.product_id === productId)
            .sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
        return mappings
            .map((pmg) => menu.modifier_groups.find((g) => g.id === pmg.group_id))
            .filter(Boolean);
    }, [menu.product_modifier_groups, menu.modifier_groups]);

    const getGroupModifiers = useCallback((groupId) => {
        return (menu.modifiers || [])
            .filter((m) => m.group_id === groupId && m.is_active)
            .sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
    }, [menu.modifiers]);

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

    // ✅ OPTIMASI: Memoized calculation untuk modal subtotal
    const modalItemSubtotal = useMemo(() => {
        if (!selectedProduct) return 0;
        // Gunakan original_price jika produk adalah hot deal, jika tidak pakai harga normal
        let price = Number(selectedProduct.original_price || selectedProduct.price || 0);
        if (!Number.isFinite(price)) price = 0;

        Object.values(selectedModifiers || {}).flat().filter(Boolean).forEach(modId => {
            const modifier = menu.modifiers.find(m => m.id === modId);
            if (modifier) {
                const delta = Number(modifier.price_delta || 0);
                if (Number.isFinite(delta)) {
                    price += delta;
                }
            }
        });

        return price * quantity;
    }, [selectedProduct, selectedModifiers, quantity, menu.modifiers]);

    const calculateItemSubtotal = useCallback(() => modalItemSubtotal, [modalItemSubtotal]);

    // ✅ OPTIMASI: Memoized modifier groups untuk selected product
    const selectedProductModifierGroups = useMemo(() => {
        if (!selectedProduct) return [];
        return getProductModifierGroups(selectedProduct.id);
    }, [selectedProduct, getProductModifierGroups]);

    // ✅ OPTIMASI: Memoized modifiers by group untuk modal
    const modifiersByGroup = useMemo(() => {
        const result = {};
        selectedProductModifierGroups.forEach(group => {
            result[group.id] = getGroupModifiers(group.id);
        });
        return result;
    }, [selectedProductModifierGroups, getGroupModifiers]);

    const canAddToCart = useCallback(() => {
        if (!selectedProduct) return false;
        return selectedProductModifierGroups.every(group => {
            if (!group.is_required) return true;
            const selected = selectedModifiers[group.id] || [];
            return selected.length >= group.min_select;
        });
    }, [selectedProduct, selectedModifiers, selectedProductModifierGroups]);

    // Optimized handlers dengan useCallback
    const handleSelectProduct = useCallback((product) => {
        setSelectedProduct(product);
        setQuantity(1);
        setSelectedModifiers({});
    }, []);

    const addToCart = useCallback(() => {
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

        setCart(prev => [...prev, cartItem]);
        setSelectedProduct(null);
        // notify.success(`${selectedProduct.name} ditambahkan ke cart`);
    }, [canAddToCart, getProductModifierGroups, getGroupModifiers, selectedProduct, selectedModifiers, quantity, calculateItemSubtotal]);

    const removeFromCart = useCallback((index) => {
        setCart(prev => prev.filter((_, i) => i !== index));
    }, []);

    const updateCartItemQty = useCallback((index, newQty) => {
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
    }, []);

    // Optimized calculations dengan useMemo
    const getTotalAmount = useCallback(() => {
        return cart.reduce((sum, item) => sum + item.subtotal, 0);
    }, [cart]);

    // Memoized cart total dengan dependency yang lebih spesifik
    const cartTotal = useMemo(() => {
        if (cart.length === 0) return 0;
        return cart.reduce((sum, item) => sum + item.subtotal, 0);
    }, [cart]);
    
    // Memoized cart count untuk performa
    const cartCount = useMemo(() => cart.length, [cart.length]);

    // Optimized product filtering dengan useMemo dan pagination
    const filteredProducts = useMemo(() => {
        // Early return jika tidak ada products
        if (!menu.products?.length) return [];
        
        const filtered = menu.products.filter(product => {
            if (!product?.is_active) return false;
            
            // Cache toLowerCase untuk search performance
            const searchLower = searchQuery.toLowerCase();
            const productNameLower = product.name?.toLowerCase() || '';
            
            const matchesCategory = !selectedCategory || String(product.category_id) === String(selectedCategory);
            const matchesSearch = !searchQuery || productNameLower.includes(searchLower);
            
            return matchesCategory && matchesSearch;
        });
        
        return filtered.slice(0, productsToShow);
    }, [menu.products, selectedCategory, searchQuery, productsToShow]);

    // Function to load more products
    const loadMoreProducts = useCallback(() => {
        setProductsToShow(prev => prev + 8);
    }, []);

    // Reset pagination when filters change
    useEffect(() => {
        setProductsToShow(8);
    }, [selectedCategory, searchQuery]);

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
            const orderData = {
                customer_name: customerInfo.customer_name,
                customer_phone: customerInfo.customer_phone,
                customer_id: selectedCustomer ? selectedCustomer.id : null, // Link to existing customer
                type: customerInfo.order_type, // Backend expects 'type', not 'order_type'
                payment_method: customerInfo.payment_method,
                delivery_address: customerInfo.delivery_address || null, // ✅ Send delivery_address as separate field
                notes: null, // Keep notes separate from delivery address
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
                delivery_address: customerInfo.delivery_address || null,
                notes: null,
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
            <div className="max-w-7xl mx-auto space-y-6 pb-48 lg:pb-0">
                <section className="bg-gradient-to-br from-primary-600 via-primary-500 to-primary-700 text-white rounded-3xl shadow-2xl p-4 sm:p-8">
                    <div className="flex flex-col gap-6 lg:flex-row lg:items-center">
                        <div className="flex-1">
                            <p className="text-xs uppercase tracking-[0.35em] text-white/70 mb-2">POS Counter</p>
                            <h1 className="text-2xl sm:text-3xl font-bold">Kasir Kedai Yuru</h1>
                            <p className="sm:text-base text-white/80 mt-2 max-w-2xl hidden sm:block">
                                Kelola pesanan dine-in, pickup, dan delivery dengan tampilan yang nyaman di mobile, tablet, maupun desktop.
                            </p>
                            <p className="text-xs text-white/80 mt-2 sm:hidden">
                                Layout cepat untuk buat order dine-in, pickup, atau delivery.
                            </p>
                            <div className="mt-4 flex flex-wrap gap-3 lg:hidden">
                                <button
                                    type="button"
                                    onClick={() => setShowMobileCart(true)}
                                    className="flex-1 min-w-[140px] bg-white/10 border border-white/30 backdrop-blur rounded-2xl px-4 py-3 text-sm font-semibold tracking-wide hover:bg-white/20 transition-colors"
                                >
                                    Keranjang ({cart.length})
                                </button>
                                <button
                                    type="button"
                                    onClick={() => cart.length > 0 && setShowPaymentModal(true)}
                                    className="flex-1 min-w-[140px] bg-white text-primary-700 rounded-2xl px-4 py-3 text-sm font-bold shadow-lg hover:bg-primary-50 transition-colors disabled:opacity-60"
                                    disabled={cart.length === 0}
                                >
                                    Proses Pembayaran
                                </button>
                            </div>
                        </div>
                        <div className="hidden sm:grid grid-cols-2 sm:grid-cols-3 gap-3 lg:max-w-md">
                            <div className="bg-white/10 border border-white/20 rounded-2xl p-4 backdrop-blur">
                                <p className="text-xs uppercase tracking-wide text-white/80 mb-1">Total Item</p>
                                <p className="text-2xl font-semibold">{cart.length}</p>
                                <p className="text-xs text-white/70 mt-1">Dalam keranjang</p>
                            </div>
                            <div className="bg-white/10 border border-white/20 rounded-2xl p-4 backdrop-blur">
                                <p className="text-xs uppercase tracking-wide text-white/80 mb-1">Nilai Transaksi</p>
                                <p className="text-2xl font-semibold">{formatRupiah(cartTotal)}</p>
                                <p className="text-xs text-white/70 mt-1">Realtime update</p>
                            </div>
                            <div className="bg-white/10 border border-white/20 rounded-2xl p-4 backdrop-blur">
                                <p className="text-xs uppercase tracking-wide text-white/80 mb-1">Mode Order</p>
                                <p className="text-lg font-semibold capitalize">
                                    {customerInfo.order_type === 'takeaway' ? 'TakeAway' : customerInfo.order_type.replace('_', ' ')}
                                </p>
                                <p className="text-xs text-white/70 mt-1">Metode {customerInfo.payment_method}</p>
                            </div>
                        </div>
                        <div className="sm:hidden grid grid-cols-2 gap-2">
                            <div className="bg-white/10 border border-white/20 rounded-2xl p-3 text-center">
                                <p className="text-[10px] uppercase tracking-wide text-white/70">Item</p>
                                <p className="text-lg font-semibold">{cart.length}</p>
                            </div>
                            <div className="bg-white/10 border border-white/20 rounded-2xl p-3 text-center">
                                <p className="text-[10px] uppercase tracking-wide text-white/70">Total</p>
                                <p className="text-lg font-semibold">{formatRupiah(cartTotal)}</p>
                            </div>
                        </div>
                    </div>
                </section>

                <section className="grid gap-6 items-start lg:grid-cols-[1.75fr,1fr]">
                    <div className="space-y-5">
                        <div className="bg-white border border-gray-100 rounded-3xl shadow-lg p-3 sm:p-6 space-y-3 sm:space-y-4">
                            <div className="flex flex-col gap-2 md:flex-row md:items-center">
                                <div className="relative flex-1">
                                    <input
                                        type="text"
                                        placeholder="Cari produk, kategori, atau catatan..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="w-full pl-11 pr-4 py-2.5 border-2 border-gray-100 rounded-2xl focus:border-primary-500 focus:ring-0 text-sm sm:text-base"
                                    />
                                    <svg className="w-5 h-5 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                    </svg>
                                </div>
                                <div className="flex items-center gap-2">
                                    <label htmlFor="categoryFilter" className="text-sm font-medium text-gray-700 whitespace-nowrap">Filter:</label>
                                    <select
                                        id="categoryFilter"
                                        value={selectedCategory}
                                        onChange={e => setSelectedCategory(e.target.value)}
                                        className="border-2 border-gray-100 rounded-2xl px-3 py-2.5 focus:border-primary-500 focus:ring-0 text-sm min-w-0 w-full sm:w-auto"
                                    >
                                        <option value="">Semua Menu</option>
                                        {menu.categories.map(category => (
                                            <option key={category.id} value={category.id}>{category.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            <div className="text-xs sm:text-sm text-gray-500">
                                <span className="font-semibold text-gray-900">{filteredProducts.length}</span> dari {menu.products.filter(p => 
                                    (!selectedCategory || String(p.category_id) === String(selectedCategory)) && 
                                    p.name.toLowerCase().includes(searchQuery.toLowerCase()) && 
                                    p.is_active
                                ).length} produk ditampilkan
                            </div>
                        </div>

                        <div className="grid gap-3 grid-cols-2 sm:gap-4 xl:grid-cols-3 2xl:grid-cols-4">
                            {filteredProducts.length === 0 ? (
                                <div className="col-span-full bg-white border border-dashed border-gray-300 rounded-3xl p-10 text-center shadow-sm">
                                    <div className="text-4xl mb-3">😔</div>
                                    <p className="text-gray-700 font-semibold">Produk tidak ditemukan</p>
                                    <p className="text-sm text-gray-500 mt-1">Coba ubah kata kunci pencarian atau pilih kategori lain.</p>
                                </div>
                            ) : (
                                filteredProducts.map((product) => (
                                    <ProductCard
                                        key={product.id}
                                        product={product}
                                        formatRupiah={formatRupiah}
                                        onSelectProduct={handleSelectProduct}
                                    />
                                ))
                            )}
                        </div>
                        
                        {/* Load More Button */}
                        {filteredProducts.length === productsToShow && menu.products.filter(p => 
                            (!selectedCategory || String(p.category_id) === String(selectedCategory)) && 
                            p.name.toLowerCase().includes(searchQuery.toLowerCase()) && 
                            p.is_active
                        ).length > productsToShow && (
                            <div className="text-center mt-6">
                                <button
                                    onClick={loadMoreProducts}
                                    className="px-6 py-3 bg-gradient-to-r from-primary-600 to-primary-700 text-white rounded-2xl font-semibold hover:from-primary-700 hover:to-primary-800 transition-all shadow-lg hover:shadow-xl transform hover:scale-105"
                                >
                                    Tampilkan Lebih Banyak Produk
                                </button>
                            </div>
                        )}
                    </div>

                    <aside className="hidden lg:flex flex-col bg-white border border-gray-100 rounded-3xl shadow-xl p-5 sticky top-6 h-[calc(100vh-240px)]">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <p className="text-lg font-semibold text-gray-900">Keranjang</p>
                                <p className="text-sm text-gray-500">{cartCount} item dipilih</p>
                            </div>
                            <span className="px-3 py-1 text-xs font-semibold rounded-full bg-primary-50 text-primary-700">Total {formatRupiah(cartTotal)}</span>
                        </div>
                        <div className="flex-1 overflow-y-auto pr-1 space-y-4">
                            {cartCount === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-center text-gray-500">
                                    <div className="text-5xl mb-3">🛒</div>
                                    <p className="font-medium">Keranjang masih kosong</p>
                                    <p className="text-sm text-gray-400 mt-1">Pilih produk untuk mulai membuat pesanan.</p>
                                </div>
                            ) : (
                                cart.map((item, index) => (
                                    <CartItem 
                                        key={`cart-${index}-${item.product_name}`}
                                        item={item}
                                        index={index}
                                        onRemove={removeFromCart}
                                        onUpdateQty={updateCartItemQty}
                                    />
                                ))
                            )}
                        </div>
                        <div className="mt-4 border-t pt-4 space-y-3">
                            <div className="flex items-center justify-between text-sm text-gray-500">
                                <span>Subtotal</span>
                                <span className="font-semibold text-gray-900">{formatRupiah(cartTotal)}</span>
                            </div>
                            <button
                                onClick={() => setShowPaymentModal(true)}
                                disabled={cartCount === 0}
                                className="w-full py-3 rounded-2xl font-bold text-white bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Proses Pembayaran
                            </button>
                        </div>
                    </aside>
                </section>
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

                            {/* ✅ OPTIMASI: Use memoized data instead of function calls */}
                            {selectedProductModifierGroups.map(group => {
                                const modifiers = modifiersByGroup[group.id] || [];
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
                                Tambah ke Cart - {formatRupiah(modalItemSubtotal)}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Payment Modal */}
            {showPaymentModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-3 z-50">
                    <div className="bg-white rounded-xl shadow-lg w-full max-w-lg max-h-[95vh] flex flex-col">
                        {/* Header */}
                        <div className="bg-primary-600 px-6 py-4 text-white rounded-t-xl">
                            <div className="flex justify-between items-center">
                                <div>
                                    <h2 className="text-xl font-bold">Info Pelanggan & Pembayaran</h2>
                                    <p className="text-primary-100 text-sm mt-1">Lengkapi data untuk proses order</p>
                                </div>
                                <button
                                    onClick={() => setShowPaymentModal(false)}
                                    className="text-white hover:text-primary-200 p-1 hover:bg-primary-700 rounded-lg">
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                        </div>

                        {/* Content - Scrollable */}
                        <div className="flex-1 p-6 overflow-y-auto" style={{ maxHeight: 'calc(95vh - 200px)' }}>
                            <div className="space-y-5">
                                {/* Customer Type Selection */}
                                <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                                    <label className="block text-sm font-semibold text-blue-800 mb-3">
                                        🔹 Pilih Tipe Customer
                                    </label>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setCustomerType('guest');
                                                resetCustomerSelection();
                                            }}
                                            className={`px-4 py-3 rounded-lg border-2 text-center ${
                                                customerType === 'guest'
                                                    ? 'bg-green-500 text-white border-green-500'
                                                    : 'bg-white text-gray-700 border-gray-200 hover:border-green-300'
                                            }`}
                                        >
                                            <div className="font-medium text-sm">Customer Baru</div>
                                            <div className={`text-xs ${
                                                customerType === 'guest' ? 'text-green-100' : 'text-gray-500'
                                            }`}>
                                                Tanpa registrasi
                                            </div>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setCustomerType('existing')}
                                            className={`px-4 py-3 rounded-lg border-2 text-center ${
                                                customerType === 'existing'
                                                    ? 'bg-blue-500 text-white border-blue-500'
                                                    : 'bg-white text-gray-700 border-gray-200 hover:border-blue-300'
                                            }`}
                                        >
                                            <div className="font-medium text-sm">Customer Terdaftar</div>
                                            <div className={`text-xs ${
                                                customerType === 'existing' ? 'text-blue-100' : 'text-gray-500'
                                            }`}>
                                                Member dengan poin
                                            </div>
                                        </button>
                                    </div>
                                </div>

                                {/* Existing Customer Search */}
                                {customerType === 'existing' && (
                                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                        <label className="block text-sm font-semibold text-blue-800 mb-3">
                                            🔍 Cari Customer {selectedCustomer && <span className="text-green-600">✓</span>}
                                        </label>
                                        {selectedCustomer ? (
                                            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                                                <div className="flex justify-between items-start">
                                                    <div className="flex space-x-3">
                                                        <div className="w-10 h-10 bg-primary-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                                                            {selectedCustomer.name.charAt(0).toUpperCase()}
                                                        </div>
                                                        <div>
                                                            <p className="font-bold text-green-800">{selectedCustomer.name}</p>
                                                            <p className="text-sm text-green-600">📱 {selectedCustomer.phone}</p>
                                                            <p className="text-sm text-green-600">📧 {selectedCustomer.email}</p>
                                                            {selectedCustomer.order_count > 0 && (
                                                                <div className="flex items-center space-x-2 mt-2">
                                                                    <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-md font-medium">
                                                                        {selectedCustomer.order_count} orders
                                                                    </span>
                                                                    {selectedCustomer.order_count >= 10 && (
                                                                        <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded-md font-medium">
                                                                            VIP
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <button
                                                        onClick={resetCustomerSelection}
                                                        className="text-red-500 hover:text-red-700 hover:bg-red-100 p-2 rounded-lg"
                                                    >
                                                        ❌
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="relative">
                                                <input
                                                    type="text"
                                                    value={customerSearchQuery}
                                                    onChange={(e) => setCustomerSearchQuery(e.target.value)}
                                                    className="w-full px-4 py-3 pl-10 border-2 border-blue-200 rounded-lg focus:border-primary-500 focus:ring-0"
                                                    placeholder="Ketik nama, phone, atau email..."
                                                />
                                                <span className="absolute left-3 top-3.5 text-blue-400">🔍</span>
                                                {isSearching && (
                                                    <span className="absolute right-3 top-3.5 text-primary-600">⏳</span>
                                                )}
                                                
                                                {/* Search Results */}
                                                {searchResults.length > 0 && (
                                                    <div className="absolute z-10 w-full mt-2 bg-white border border-blue-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                                                        {CustomerSearchResults}
                                                    </div>
                                                )}
                                                
                                                {customerSearchQuery.trim() && !isSearching && searchResults.length === 0 && (
                                                    <div className="absolute z-10 w-full mt-2 bg-white border border-orange-200 rounded-lg shadow-md p-4">
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
                                    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                                        <div className="space-y-4">
                                            <div>
                                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                                    👤 Nama Pelanggan {customerType === 'guest' && '*'}
                                                </label>
                                                <input
                                                    type="text"
                                                    value={customerInfo.customer_name}
                                                    onChange={(e) => setCustomerInfo({ ...customerInfo, customer_name: e.target.value })}
                                                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-primary-500 focus:ring-0 disabled:bg-gray-100"
                                                    placeholder="Masukkan nama pelanggan..."
                                                    disabled={customerType === 'existing' && selectedCustomer}
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                                    📱 Nomor HP {customerType === 'guest' ? '(Opsional)' : '*'}
                                                </label>
                                                <input
                                                    type="text"
                                                    value={customerInfo.customer_phone}
                                                    onChange={(e) => setCustomerInfo({ ...customerInfo, customer_phone: e.target.value })}
                                                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-primary-500 focus:ring-0 disabled:bg-gray-100"
                                                    placeholder="08xxxxxxxxxx"
                                                    disabled={customerType === 'existing' && selectedCustomer}
                                                />
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
                                    <div className="grid grid-cols-2 gap-2">
                                        {/* Dine In */}
                                        <button
                                            type="button"
                                            onClick={() => setCustomerInfo({ ...customerInfo, order_type: 'dine_in' })}
                                            className={`p-3 border-2 rounded-lg transition-all flex flex-col items-center space-y-1 ${
                                                customerInfo.order_type === 'dine_in'
                                                    ? 'border-primary-500 bg-primary-50 text-primary-700'
                                                    : 'border-amber-200 hover:border-amber-300 text-amber-700'
                                            }`}
                                        >
                                            <span className="text-lg"></span>
                                            <div className="text-center">
                                                <div className="font-semibold text-xs">Dine In</div>
                                                <div className="text-xs opacity-75">Makan Di Tempat</div>
                                            </div>
                                        </button>

                                        {/* TakeAway */}
                                        <button
                                            type="button"
                                            onClick={() => setCustomerInfo({ ...customerInfo, order_type: 'takeaway' })}
                                            className={`p-3 border-2 rounded-lg transition-all flex flex-col items-center space-y-1 ${
                                                customerInfo.order_type === 'takeaway'
                                                    ? 'border-primary-500 bg-primary-50 text-primary-700'
                                                    : 'border-amber-200 hover:border-amber-300 text-amber-700'
                                            }`}
                                        >
                                            <span className="text-lg"></span>
                                            <div className="text-center">
                                                <div className="font-semibold text-xs">TakeAway</div>
                                                <div className="text-xs opacity-75">Bawa Pulang</div>
                                            </div>
                                        </button>

                                        {/* Pickup */}
                                        <button
                                            type="button"
                                            onClick={() => setCustomerInfo({ ...customerInfo, order_type: 'pickup' })}
                                            className={`p-3 border-2 rounded-lg transition-all flex flex-col items-center space-y-1 ${
                                                customerInfo.order_type === 'pickup'
                                                    ? 'border-primary-500 bg-primary-50 text-primary-700'
                                                    : 'border-amber-200 hover:border-amber-300 text-amber-700'
                                            }`}
                                        >
                                            <div className="text-center">
                                                <div className="font-semibold text-xs">Pickup</div>
                                                <div className="text-xs opacity-75">Ambil Sendiri</div>
                                            </div>
                                        </button>

                                        {/* Delivery */}
                                        <button
                                            type="button"
                                            onClick={() => setCustomerInfo({ ...customerInfo, order_type: 'delivery' })}
                                            className={`p-3 border-2 rounded-lg transition-all flex flex-col items-center space-y-1 ${
                                                customerInfo.order_type === 'delivery'
                                                    ? 'border-primary-500 bg-primary-50 text-primary-700'
                                                    : 'border-amber-200 hover:border-amber-300 text-amber-700'
                                            }`}
                                        >
                                            <div className="text-center">
                                                <div className="font-semibold text-xs">Delivery</div>
                                                <div className="text-xs opacity-75">Antar Langsung</div>
                                            </div>
                                        </button>
                                    </div>
                                </div>

                                {/* Delivery Info (if delivery selected) */}
                                {customerInfo.order_type === 'delivery' && (
                                    <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
                                        <div className="space-y-4">
                                            <div>
                                                <label className="block text-sm font-semibold text-blue-800 mb-2 flex items-center space-x-2">
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
                                        <span>Metode Pembayaran</span>
                                    </label>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                        <button
                                            type="button"
                                            onClick={() => setCustomerInfo({ ...customerInfo, payment_method: 'cash' })}
                                            className={`group px-3 py-2 rounded-lg border-2 text-xs font-medium transition-all duration-200 ${
                                                customerInfo.payment_method === 'cash'
                                                    ? 'bg-green-600 text-white border-green-600 shadow-lg'
                                                    : 'bg-white text-green-700 border-green-300 hover:border-green-500 hover:bg-green-100'
                                            }`}
                                        >
                                            <div className="flex items-center justify-center space-x-1">
                                                <span>Cash</span>
                                            </div>
                                            <div className="text-xs opacity-75">Pembayaran Tunai</div>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setCustomerInfo({ ...customerInfo, payment_method: 'qris' })}
                                            className={`group px-3 py-2 rounded-lg border-2 text-xs font-medium transition-all duration-200 ${
                                                customerInfo.payment_method === 'qris'
                                                    ? 'bg-green-600 text-white border-green-600 shadow-lg'
                                                    : 'bg-white text-green-700 border-green-300 hover:border-green-500 hover:bg-green-100'
                                            }`}
                                        >
                                            <div className="flex items-center justify-center space-x-1">
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
                        <div className="bg-gray-50 border-t px-6 py-4 rounded-b-xl">
                            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-3 sm:space-y-0">
                                <div className="text-center sm:text-left">
                                    <p className="text-sm text-gray-600 mb-1">Total Bayar:</p>
                                    <p className="text-2xl font-bold text-primary-600">{formatRupiah(cartTotal)}</p>
                                </div>
                                <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3 w-full sm:w-auto">
                                    <button
                                        onClick={() => setShowPaymentModal(false)}
                                        className="w-full sm:w-auto px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50"
                                    >
                                        Batal
                                    </button>
                                    <button
                                        onClick={handleSubmitOrder}
                                        className="w-full sm:w-auto px-6 py-3 bg-primary-600 text-white rounded-lg font-bold hover:bg-primary-700"
                                    >
                                        Proses Order
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
                                                        <p className="text-lg font-bold text-primary-600">{formatRupiah(cartTotal)}</p>
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
                                                <p className="text-2xl font-bold text-primary-600">{formatRupiah(cartTotal)}</p>
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
