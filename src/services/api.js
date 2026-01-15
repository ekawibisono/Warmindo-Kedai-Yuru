import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://api.kedaiyuru.click/api';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add staff key to requests if available
api.interceptors.request.use((config) => {
  const staffKey = localStorage.getItem('staff_key');
  if (staffKey) {
    config.headers['x-staff-key'] = staffKey;
  }
  return config;
});

export const authAPI = {
  verifyStaffKey: (staffKey) => api.post('/staff/auth/verify', {}, {
    headers: { 'x-staff-key': staffKey }
  }),
};

// Public API (Customer)
export const publicAPI = {
  // Get menu
  getMenu: () => api.get('/public/menu'),

  // Create order
  createOrder: (orderData) => api.post('/public/orders', orderData),

  // Get order by orderNo and token
  getOrder: (orderNo, token) => api.get(`/public/orders/${orderNo}?token=${token}`),

  // Upload QRIS proof
  uploadQrisProof: (orderNo, token, file, amount) => {
    const formData = new FormData();
    formData.append('proof', file);
    formData.append('amount', amount);

    return api.post(`/public/orders/${orderNo}/qris-proof?token=${token}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },

  // Validate discount code (NEW)
  validateDiscount: (code, orderAmount) => api.post('/public/discounts/validate', { 
    code, 
    order_amount: orderAmount 
  }),

};

// Staff API (Admin & Kasir)
export const staffAPI = {
  // POS - Create cash order
  createPosCashOrder: (orderData) => api.post('/staff/pos/orders', orderData),

  // Kitchen - Get queue
  getKitchenQueue: () => api.get('/staff/kitchen/queue'),

  // Kitchen - Get order detail
  getKitchenOrder: (orderId) => api.get(`/staff/kitchen/orders/${orderId}`),

  // Kitchen - Update status
  updateKitchenStatus: (orderId, status) =>
    api.patch(`/staff/kitchen/orders/${orderId}/status`, { status }),

  // Payments - Get pending
  getPendingPayments: () => api.get('/staff/payments/pending'),

  // Payments - Verify
  verifyPayment: (paymentId, status) =>
    api.post(`/staff/payments/${paymentId}/verify`, { status }),

  // Catalog - Categories
  getCategories: () => api.get('/staff/catalog/categories'),
  createCategory: (data) => api.post('/staff/catalog/categories', data),
  updateCategory: (id, data) => api.patch(`/staff/catalog/categories/${id}`, data),
  deleteCategory: (id) => api.delete(`/staff/catalog/categories/${id}`),

  // Catalog - Products
  getProducts: () => api.get('/staff/catalog/products'),
  createProduct: (data) => api.post('/staff/catalog/products', data),
  updateProduct: (id, data) => api.patch(`/staff/catalog/products/${id}`, data),
  deleteProduct: (id) => api.delete(`/staff/catalog/products/${id}`),

  // Catalog - Modifier Groups
  getModifierGroups: () => api.get('/staff/catalog/modifier-groups'),
  createModifierGroup: (data) => api.post('/staff/catalog/modifier-groups', data),
  updateModifierGroup: (id, data) => api.patch(`/staff/catalog/modifier-groups/${id}`, data),
  deleteModifierGroup: (id) => api.delete(`/staff/catalog/modifier-groups/${id}`),

  // Catalog - Modifiers
  getModifiers: () => api.get('/staff/catalog/modifiers'),
  createModifier: (data) => api.post('/staff/catalog/modifiers', data),
  updateModifier: (id, data) => api.patch(`/staff/catalog/modifiers/${id}`, data),
  deleteModifier: (id) => api.delete(`/staff/catalog/modifiers/${id}`),

  // Catalog - Product Modifier Groups mapping
  getProductModifierGroups: () => api.get('/staff/catalog/product-modifier-groups'),
  addProductModifierGroup: (data) => api.post('/staff/catalog/product-modifier-groups', data),
  removeProductModifierGroup: (data) => api.delete('/staff/catalog/product-modifier-groups', { data }),

  getAllOrders: (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return api.get(`/staff/orders${queryString ? '?' + queryString : ''}`);
  },

  // Store Settings
  getStoreSettings: () => api.get('/staff/settings'),
  updateStoreSetting: (key, value) => api.patch('/staff/settings', { key, value }),

  // ========== DISCOUNTS API (NEW) ==========
  getDiscounts: (activeOnly = false) => api.get(`/staff/discounts${activeOnly ? '?active=true' : ''}`),
  getDiscountById: (id) => api.get(`/staff/discounts/${id}`),
  createDiscount: (data) => api.post('/staff/discounts', data),
  updateDiscount: (id, data) => api.put(`/staff/discounts/${id}`, data),
  deleteDiscount: (id) => api.delete(`/staff/discounts/${id}`),
  getDiscountStats: (id) => api.get(`/staff/discounts/${id}/stats`),

  // ========== HOT DEALS API (NEW) ==========
  // Get all hot deals products
  getHotDeals: () => api.get('/staff/hot-deals'),
  // Get all products with hot deal status
  getProductsWithHotDealStatus: () => api.get('/staff/hot-deals/products'),
  // Get hot deals statistics
  getHotDealsStats: () => api.get('/staff/hot-deals/stats'),
  // Trigger auto update based on sales
  updateHotDealsAuto: () => api.post('/staff/hot-deals/update'),
  // Apply hot deal to product (manual)
  applyHotDeal: (productId, discountPercent) => 
    api.post(`/staff/hot-deals/products/${productId}/apply`, { discount_percent: discountPercent }),
  // Remove hot deal from product
  removeHotDeal: (productId) => 
    api.delete(`/staff/hot-deals/products/${productId}/remove`),
  // Get tier settings
  getHotDealTiers: () => api.get('/staff/hot-deals/tiers'),
  // Create tier setting
  createHotDealTier: (data) => api.post('/staff/hot-deals/tiers', data),
  // Update tier setting
  updateHotDealTier: (tierId, data) => api.put(`/staff/hot-deals/tiers/${tierId}`, data),
  // Delete tier setting
  deleteHotDealTier: (tierId) => api.delete(`/staff/hot-deals/tiers/${tierId}`),

  // ========== WHATSAPP API (NEW) ==========
  // Send WhatsApp message
  sendWhatsAppMessage: (data) => api.post('/whatsapp/send', data),
  // Send bulk WhatsApp message
  sendWhatsAppBulk: (data) => api.post('/whatsapp/send-bulk', data),
  // Get WhatsApp device info
  getWhatsAppDevice: () => api.get('/whatsapp/device'),
  // Validate WhatsApp number
  validateWhatsAppNumber: (number) => api.post('/whatsapp/validate', { number }),

  // ========== STAFF MANAGEMENT API (NEW) ==========
  // List all staff
  getStaffList: () => api.get('/staff/management/list'),
  // Get single staff
  getStaffById: (id) => api.get(`/staff/management/${id}`),
  // Create new staff
  createStaff: (data) => api.post('/staff/management', data),
  // Update staff
  updateStaff: (id, data) => api.patch(`/staff/management/${id}`, data),
  // Regenerate staff key
  regenerateStaffKey: (id) => api.post(`/staff/management/${id}/regenerate-key`),
  // Delete (deactivate) staff
  deleteStaff: (id) => api.delete(`/staff/management/${id}`),

};

export default api;