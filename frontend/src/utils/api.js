import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:5000/api',
  headers: { 'Content-Type': 'application/json' },
});

const authConfig = (token) => ({ headers: { Authorization: `Bearer ${token}` } });

export const fetchProducts = (params) => api.get('/products', { params });
export const fetchProduct = (id) => api.get(`/products/${id}`);
export const fetchFeaturedProducts = () => api.get('/products', { params: { featured: true, limit: 3 } });
export const fetchCategories = () => api.get('/categories');
export const loginUser = (payload) => api.post('/auth/login', payload);
export const registerUser = (payload) => api.post('/auth/register', payload);
export const fetchCart = (token) => api.get('/cart', authConfig(token));
export const updateCart = (items, token) => api.post('/cart', { items }, authConfig(token));
export const fetchUserProfile = (token) => api.get('/auth/profile', authConfig(token));
export const fetchUserOrders = (token) => api.get('/orders/my-orders', authConfig(token));
export const fetchWishlist = (token) => api.get('/users/wishlist', authConfig(token));
export const addWishlistItem = (productId, token) => api.post(`/users/wishlist/${productId}`, {}, authConfig(token));
export const removeWishlistItem = (productId, token) => api.delete(`/users/wishlist/${productId}`, authConfig(token));
export const submitReview = (productId, payload, token) => api.post(`/products/${productId}/reviews`, payload, authConfig(token));
export const validatePromo = (code, amount) => api.post('/promos/validate', { code, amount });
export const createOrder = (payload, token) => api.post('/orders', payload, authConfig(token));
export const fetchOrderDetail = (id, token) => api.get(`/orders/${id}`, authConfig(token));
export const sendSupportMessage = (payload) => api.post('/support/message', payload);
export const adminLogin = (payload) => api.post('/admin/login', payload);
export const fetchDashboard = (token) => api.get('/admin/dashboard', authConfig(token));
export default api;
