import React, { useState, useEffect } from 'react';
import AdminLayout from '../components/admin/AdminLayout';
import { publicAPI } from '../services/api';
import notify from '../components/common/Toast';

/**
 * POSCounterBackup.js
 * Backup file dari POSCounter.js sebelum modifikasi harga normal
 * Dibuat: 15 Januari 2026
 * File ini TIDAK DIGUNAKAN di aplikasi, hanya untuk backup
 * Versi ini menggunakan harga promo (hot deal) jika ada
 */

const POSCounterBackup = () => {
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

    const formatRupiah = (amount) => {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0,
        }).format(amount);
    };

    const getProductModifierGroups = (productId) => {
        const groupIds = menu.product_modifier_groups
            .filter(pmg => pmg.product_id === productId)
            .map(pmg => pmg.group_id);
        return menu.modifier_groups.filter(g => groupIds.includes(g.id));
    };

    const getGroupModifiers = (groupId) => {
        return menu.modifiers.filter(m => m.group_id === groupId && m.is_active);
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

    const calculateItemSubtotal = () => {
        if (!selectedProduct) return 0;
        let price = selectedProduct.price;

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

        const modifiers = Object.entries(selectedModifiers).flatMap(([groupId, modIds]) =>
            modIds.map(modId => ({
                modifier_id: modId,
                quantity: 1,
                name: menu.modifiers.find(m => m.id === modId)?.name,
                price_delta: menu.modifiers.find(m => m.id === modId)?.price_delta || 0
            }))
        );

        const cartItem = {
            product_id: selectedProduct.id,
            product_name: selectedProduct.name,
            product_price: selectedProduct.price,
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
        if (newQty < 1) return;
        const updated = [...cart];
        const item = updated[index];
        const basePrice = item.product_price + item.modifiers.reduce((sum, m) => sum + m.price_delta, 0);
        item.quantity = newQty;
        item.subtotal = basePrice * newQty;
        setCart(updated);
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
                type: customerInfo.order_type,
                payment_method: customerInfo.payment_method,
                notes,
                discount_code: customerInfo.discount_code || null,
                items: cart.map(item => ({
                    product_id: item.product_id,
                    qty: item.quantity,
                    modifiers: item.modifiers.map(m => ({
                        modifier_id: m.modifier_id,
                        qty: m.quantity
                    }))
                }))
            };

            const response = await publicAPI.createOrder(orderData);

            if (customerInfo.payment_method === 'cash') {
                notify.success(`Order ${response.data.order_no} berhasil dibuat!`);
            } else {
                notify.success(`Order ${response.data.order_no} berhasil dibuat! Menunggu pembayaran QRIS.`);
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
            <div className="max-w-7xl mx-auto">
                <h1 className="text-3xl font-bold text-gray-900 mb-6">🛒 POS Kasir (BACKUP)</h1>
                <div className="bg-yellow-100 border-l-4 border-yellow-500 p-4 mb-4">
                    <p className="text-yellow-700">⚠️ INI ADALAH FILE BACKUP - TIDAK UNTUK DIGUNAKAN</p>
                </div>

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
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
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
                                    <p className="text-primary-600 font-bold">{formatRupiah(product.price)}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Cart Section - 1 column */}
                    <div className="bg-white rounded-lg shadow-md p-4">
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
                                {formatRupiah(selectedProduct.price)}
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
        </AdminLayout>
    );
};

export default POSCounterBackup;
