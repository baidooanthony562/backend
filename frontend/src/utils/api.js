import axios from 'axios';

const api = axios.create({
  baseURL: 'https://backend-9m2y.onrender.com/api',
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      ['cindyNutToken', 'cindyNutUser', 'cindyNutAdminToken'].forEach((k) => localStorage.removeItem(k));
      window.dispatchEvent(new Event('storage'));
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

const authConfig = (token) => ({ headers: { Authorization: `Bearer ${token}` } });

export const fetchProducts = (params) => api.get('/products', { params });
export const fetchProduct = (id) => api.get(`/products/${id}`);
export const fetchFeaturedProducts = () => api.get('/products', { params: { featured: true, limit: 3 } });
export const fetchCategories = () => api.get('/categories');
export const loginUser = (payload) => api.post('/auth/login', payload);
export const registerUser = (payload) => api.post('/auth/register', payload);
export const forgotPassword = (email) => api.post('/auth/forgot-password', { email });
export const verifyResetCode = (payload) => api.post('/auth/verify-reset-code', payload);
export const resetPassword = (payload) => api.post('/auth/reset-password', payload);
export const verifyEmail = (token) => api.get(`/auth/verify-email/${token}`);
export const verifyEmailCode = (payload) => api.post('/auth/verify-email-code', payload);
export const resendVerification = (email) => api.post('/auth/resend-verification', { email });
export const fetchCart = (token) => api.get('/cart', authConfig(token));
export const updateCart = (items, token) => api.post('/cart', { items }, authConfig(token));
export const fetchUserProfile = (token) => api.get('/auth/profile', authConfig(token));
export const updateUserProfile = (payload, token) => api.put('/users/profile', payload, authConfig(token));
export const changeUserPassword = (payload, token) => api.put('/users/change-password', payload, authConfig(token));
export const fetchUserOrders = (token) => api.get('/orders/my-orders', authConfig(token));
export const fetchWishlist = (token) => api.get('/users/wishlist', authConfig(token));
export const addWishlistItem = (productId, token) => api.post(`/users/wishlist/${productId}`, {}, authConfig(token));
export const removeWishlistItem = (productId, token) => api.delete(`/users/wishlist/${productId}`, authConfig(token));
export const submitReview = (productId, payload, token) => api.post(`/products/${productId}/reviews`, payload, authConfig(token));
export const validatePromo = (code, amount) => api.post('/promos/validate', { code, amount });
export const fetchPromos = (token) => api.get('/promos', authConfig(token));
export const createPromoAdmin = (payload, token) => api.post('/promos', payload, authConfig(token));
export const deletePromoAdmin = (id, token) => api.delete(`/promos/${id}`, authConfig(token));
export const createOrder = (payload, token) => api.post('/orders', payload, authConfig(token));
export const fetchOrderDetail = (id, token) => api.get(`/orders/${id}`, authConfig(token));
export const sendSupportMessage = (payload) => api.post('/support/message', payload);
export const adminLogin = (payload) => api.post('/admin/login', payload);
export const adminLogout = (sessionId, token) => api.post('/admin/logout', { sessionId }, authConfig(token));
export const fetchAdminSessions = (token) => api.get('/admin/sessions', authConfig(token));
export const fetchDashboard = (token) => api.get('/admin/dashboard', authConfig(token));
export const fetchDailySales = (token, days = 30) => api.get(`/admin/sales/daily?days=${days}`, authConfig(token));
export const fetchAllUsers = (token) => api.get('/admin/users', authConfig(token));
export const fetchAllOrders = (token) => api.get('/orders', authConfig(token));
export const updateOrderStatus = (id, status, token) => api.put(`/orders/${id}/status`, { status }, authConfig(token));
export const createProduct = (payload, token) => api.post('/products', payload, authConfig(token));
export const updateProduct = (id, payload, token) => api.put(`/products/${id}`, payload, authConfig(token));
export const deleteProduct = (id, token) => api.delete(`/products/${id}`, authConfig(token));
export const initiateMoMoPayment = (payload, token) => api.post('/payments/momo/request', payload, authConfig(token));
export const checkMoMoStatus = (referenceId, token) => api.get(`/payments/momo/status/${referenceId}`, authConfig(token));
export default api;
