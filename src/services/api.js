import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL;

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

// Add response interceptor to handle customer auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle customer authentication errors
    if (error.response?.status === 401) {
      const requestUrl = error.config?.url || '';
      
      // Only handle customer auth routes and be more specific
      if (requestUrl.includes('/auth/customer/profile') || requestUrl.includes('/auth/customer/orders')) {
        localStorage.removeItem('customer_token');
        localStorage.removeItem('customer_data');
        
        // Trigger a custom event for components to handle logout
        window.dispatchEvent(new CustomEvent('customer-auth-failed'));
      }
    }
    
    return Promise.reject(error);
  }
);

export const authAPI = {
  verifyStaffKey: (staffKey) => api.post('/staff/auth/verify', {}, {
    headers: { 'x-staff-key': staffKey }
  }),
};

// Public API (Customer)
export const publicAPI = {
  // Get menu
  getMenu: () => api.get('/public/menu'),

  // Customer authentication
  googleLogin: (token) => api.post('/auth/customer/google', { token }),

  // Create order (with optional customer token)
  createOrder: (orderData) => {
    const customerToken = localStorage.getItem('customer_token');
    const headers = customerToken ? { 'Authorization': `Bearer ${customerToken}` } : {};
    return api.post('/public/orders', orderData, { headers });
  },

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
  validateDiscount: (code, orderAmount, items = []) => api.post('/public/discounts/validate', { 
    code, 
    order_amount: orderAmount,
    items: items
  }),

  // Customer authentication & orders (NEW)
  getCustomerProfile: () => {
    const customerToken = localStorage.getItem('customer_token');
    if (!customerToken) return Promise.reject(new Error('No customer token'));
    return api.get('/auth/customer/profile', {
      headers: { 'Authorization': `Bearer ${customerToken}` }
    });
  },

  getCustomerOrders: (page = 1, limit = 10) => {
    const customerToken = localStorage.getItem('customer_token');
    if (!customerToken) return Promise.reject(new Error('No customer token'));
    return api.get('/auth/customer/orders', {
      headers: { 'Authorization': `Bearer ${customerToken}` },
      params: { page, limit }
    });
  },

  customerLogout: () => {
    const customerToken = localStorage.getItem('customer_token');
    if (!customerToken) return Promise.resolve();
    return api.post('/auth/customer/logout', {}, {
      headers: { 'Authorization': `Bearer ${customerToken}` }
    });
  },

  updateProfile: (profileData) => {
    const customerToken = localStorage.getItem('customer_token');
    if (!customerToken) return Promise.reject(new Error('No customer token'));
    return api.put('/public/customer/profile', profileData, {
      headers: { 'Authorization': `Bearer ${customerToken}` }
    });
  },

  // Customer Points System
  getCustomerPointsSummary: () => {
    const customerToken = localStorage.getItem('customer_token');
    if (!customerToken) return Promise.reject(new Error('No customer token'));
    return api.get('/auth/customer/points/summary', {
      headers: { 'Authorization': `Bearer ${customerToken}` }
    });
  },

  getCustomerPointsHistory: (page = 1, limit = 20) => {
    const customerToken = localStorage.getItem('customer_token');
    if (!customerToken) return Promise.reject(new Error('No customer token'));
    return api.get('/auth/customer/points/history', {
      headers: { 'Authorization': `Bearer ${customerToken}` },
      params: { page, limit }
    });
  },

  // ========== POPUP BANNER API (NEW) ==========
  // Get active popup banner for customers
  getActivePopupBanner: () => api.get('/public/popup-banner/active'),

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
  reorderProductModifierGroups: (product_id, ordered_group_ids) =>
    api.post('/staff/catalog/product-modifier-groups/reorder', { product_id, ordered_group_ids }),

  getAllOrders: (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return api.get(`/staff/orders${queryString ? '?' + queryString : ''}`);
  },

  // Delete order (only for draft status)
  deleteOrder: (orderId) => api.delete(`/staff/orders/${orderId}`),

  // Store Settings
  getStoreSettings: () => api.get('/staff/settings'),
  getStoreStatus: () => api.get('/staff/settings/status'),
  updateStoreSetting: (key, value) => api.patch('/staff/settings', { key, value }),
  syncAutoSchedule: () => api.post('/staff/settings/sync-schedule'),

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
  // Get WhatsApp device info (supports both fonnte & self-hosted)
  getWhatsAppDevice: () => api.get('/whatsapp/device'),
  // Restart WhatsApp service (self-hosted only)
  reconnectWhatsApp: () => api.post('/whatsapp/reconnect'),
  // Logout from WhatsApp (self-hosted only)
  logoutWhatsApp: () => api.post('/whatsapp/logout'),
  // Get message usage statistics (anti-ban monitoring)
  getWhatsAppMessageStats: () => api.get('/whatsapp/message-stats'),
  // Get comprehensive WhatsApp status
  getWhatsAppStatus: () => api.get('/whatsapp/status'),
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

  // ========== CUSTOMER SEARCH API (NEW) ==========
  // Search existing customers for POS integration
  searchCustomers: (query) => api.get(`/staff/customers/search?q=${encodeURIComponent(query)}`),

  // ========== CUSTOMER POINTS MANAGEMENT API (NEW) ==========
  // Get list of customers with their points
  getCustomerPointsList: (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.page) params.append('page', filters.page);
    if (filters.limit) params.append('limit', filters.limit);
    if (filters.sortBy) params.append('sortBy', filters.sortBy);
    if (filters.search) params.append('search', filters.search);
    if (filters.minPoints) params.append('minPoints', filters.minPoints);
    return api.get(`/staff/customer-points?${params.toString()}`);
  },
  // Get customer points history (admin view)
  getCustomerPointsHistory: (customerId, page = 1, limit = 20) => 
    api.get(`/staff/customer-points/${customerId}/history?page=${page}&limit=${limit}`),
  // Adjust customer points manually
  adjustCustomerPoints: (customerId, data) => 
    api.post(`/staff/customer-points/${customerId}/adjust`, data),

  // ========== POPUP BANNER MANAGEMENT API (NEW) ==========
  // Get all popup banners
  getPopupBanners: () => api.get('/staff/popup-banners'),
  // Get single popup banner
  getPopupBannerById: (id) => api.get(`/staff/popup-banners/${id}`),
  // Create new popup banner
  createPopupBanner: (data) => api.post('/staff/popup-banners', data),
  // Update popup banner
  updatePopupBanner: (id, data) => api.put(`/staff/popup-banners/${id}`, data),
  // Delete popup banner
  deletePopupBanner: (id) => api.delete(`/staff/popup-banners/${id}`),
  // Toggle popup banner status
  togglePopupBanner: (id) => api.patch(`/staff/popup-banners/${id}/toggle`),

};

export default api;