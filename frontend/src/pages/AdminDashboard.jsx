import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  fetchDashboard, fetchAllUsers, fetchAllOrders, fetchProducts,
  updateOrderStatus, createProduct, updateProduct, deleteProduct,
  fetchPromos, createPromoAdmin, deletePromoAdmin,
} from '../utils/api';
import { isAdmin, getAdminToken } from '../utils/auth';
import { getProducts, saveProducts } from '../utils/productStore';
import { showToast } from '../components/Toast';

const TABS = ['Overview', 'Products', 'Orders', 'Users', 'Promos'];

const PROMO_EMPTY = { code: '', discountType: 'percent', discountValue: '', minAmount: '', expiresAt: '', description: '' };

const STATUS_COLORS = {
  Pending: 'bg-yellow-100 text-yellow-700',
  Processing: 'bg-blue-100 text-blue-700',
  Shipped: 'bg-purple-100 text-purple-700',
  Delivered: 'bg-green-100 text-green-700',
  Cancelled: 'bg-red-100 text-red-700',
};

const ALL_CATEGORIES = [
  'Blenders & Juicers',
  'Rice Cookers',
  'Pots & Pans',
  'Water Dispensers',
  'Irons & Steamers',
  'Toasters & Grills',
  'Fans & Coolers',
  'Food Processors',
];

const EMPTY = {
  name: '', description: '', price: '', stock: '',
  discount: '0', wholesalePrice: '', wholesaleMinQty: '',
  category: '', image: '', bestseller: false, restock: '',
};

export default function AdminDashboard() {
  const navigate = useNavigate();
  const token = getAdminToken();
  const fileRef = useRef(null);

  const [tab, setTab] = useState('Overview');
  const [stats, setStats] = useState(null);
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Product form
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  // Order
  const [updatingOrder, setUpdatingOrder] = useState(null);

  // Promos
  const [promos, setPromos] = useState([]);
  const [promoForm, setPromoForm] = useState(PROMO_EMPTY);
  const [savingPromo, setSavingPromo] = useState(false);
  const [promoError, setPromoError] = useState('');

  useEffect(() => {
    if (!isAdmin()) { navigate('/admin/login'); return; }
    loadAll();
  }, [navigate]);

  const loadAll = async () => {
    setLoading(true);
    setError('');
    try {
      const [dashRes, prodRes, orderRes, userRes, promoRes] = await Promise.all([
        fetchDashboard(token),
        fetchProducts(),
        fetchAllOrders(token),
        fetchAllUsers(token),
        fetchPromos(token),
      ]);
      setStats(dashRes.data);
      saveProducts(prodRes.data);
      setProducts(prodRes.data);
      setOrders(orderRes.data);
      setUsers(userRes.data);
      setPromos(promoRes.data);
    } catch {
      // Backend unavailable — use local product store silently
      setProducts(getProducts());
    } finally {
      setLoading(false);
    }
  };

  const openAdd = () => {
    setEditing(null);
    setForm(EMPTY);
    setFormError('');
    setShowForm(true);
  };

  const openEdit = (p) => {
    setEditing(p._id || p.id);
    setForm({
      name: p.name || '',
      description: p.description || '',
      price: p.price || '',
      stock: p.stock || '',
      discount: p.discount || 0,
      wholesalePrice: p.wholesalePrice || '',
      wholesaleMinQty: p.wholesaleMinQty || '',
      category: p.category?.name || p.category || '',
      image: p.images?.[0] || p.image || '',
      bestseller: p.bestseller || false,
    });
    setFormError('');
    setShowForm(true);
  };

  const handleImageFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => setForm((f) => ({ ...f, image: reader.result }));
    reader.readAsDataURL(file);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.name || !form.price || !form.stock) {
      setFormError('Name, price and stock are required.');
      return;
    }
    setSaving(true);
    setFormError('');
    try {
      const payload = {
        ...form,
        price: Number(form.price),
        discount: Number(form.discount),
        wholesalePrice: form.wholesalePrice ? Number(form.wholesalePrice) : 0,
        wholesaleMinQty: form.wholesaleMinQty ? Number(form.wholesaleMinQty) : 0,
        images: form.image ? [form.image] : [],
      };

      if (editing) {
        // Stock only increases via restock — never manually set during edit
        if (form.restock && Number(form.restock) > 0) {
          payload.restock = Number(form.restock);
        }
        delete payload.stock;
        await updateProduct(editing, payload, token);
      } else {
        payload.stock = Number(form.stock);
        await createProduct(payload, token);
      }

      // Refresh list — if this fails the save still succeeded
      try {
        const { data: freshProducts } = await fetchProducts();
        const list = Array.isArray(freshProducts) ? freshProducts : freshProducts.products || [];
        setProducts(list);
        saveProducts(list);
      } catch { /* non-critical */ }

      setShowForm(false);
      showToast(editing ? 'Product updated.' : 'Product created.');
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to save product. Please try again.';
      setFormError(msg);
      showToast(msg, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this product? This cannot be undone.')) return;
    try {
      await deleteProduct(id, token);
      const { data: freshProducts } = await fetchProducts();
      const list = Array.isArray(freshProducts) ? freshProducts : freshProducts.products || [];
      setProducts(list);
      saveProducts(list);
      showToast('Product deleted.');
    } catch {
      showToast('Failed to delete product.', 'error');
    }
  };

  const handleOrderStatus = async (orderId, status) => {
    // Optimistic update — show new status immediately so dropdown doesn't snap back
    const snapshot = orders;
    setOrders((prev) => prev.map((o) => o._id === orderId ? { ...o, status } : o));
    setUpdatingOrder(orderId);
    try {
      await updateOrderStatus(orderId, status, token);
      showToast(`Order status updated to ${status}.`);
    } catch (err) {
      setOrders(snapshot); // revert on failure
      showToast(err.response?.data?.message || 'Failed to update order status.', 'error');
    } finally {
      setUpdatingOrder(null);
    }
  };

  const handlePromoSave = async (e) => {
    e.preventDefault();
    if (!promoForm.code || !promoForm.discountValue) {
      setPromoError('Code and discount value are required.');
      return;
    }
    setSavingPromo(true);
    setPromoError('');
    try {
      const res = await createPromoAdmin({
        ...promoForm,
        discountValue: Number(promoForm.discountValue),
        minAmount: promoForm.minAmount ? Number(promoForm.minAmount) : 0,
      }, token);
      setPromos((prev) => [res.data, ...prev]);
      setPromoForm(PROMO_EMPTY);
      showToast(`Promo "${res.data.code}" created!`);
    } catch (err) {
      setPromoError(err.response?.data?.message || 'Failed to create promo.');
    } finally {
      setSavingPromo(false);
    }
  };

  const handlePromoDelete = async (id, code) => {
    if (!window.confirm(`Delete promo "${code}"?`)) return;
    try {
      await deletePromoAdmin(id, token);
      setPromos((prev) => prev.filter((p) => p._id !== id));
      showToast(`Promo "${code}" deleted.`);
    } catch {
      showToast('Failed to delete promo.', 'error');
    }
  };

  const statCards = stats ? [
    { label: 'Total Users', value: stats.totalUsers, icon: '👥', color: 'bg-blue-50 text-blue-700' },
    { label: 'Total Products', value: stats.totalProducts || products.length, icon: '📦', color: 'bg-amber-50 text-amber-700' },
    { label: 'Total Orders', value: stats.totalOrders, icon: '🛒', color: 'bg-purple-50 text-purple-700' },
    { label: 'Revenue', value: `₵${Number(stats.revenue || 0).toLocaleString()}`, icon: '💰', color: 'bg-green-50 text-green-700' },
  ] : [
    { label: 'Total Products', value: products.length, icon: '📦', color: 'bg-amber-50 text-amber-700' },
  ];

  return (
    <div className="min-h-screen bg-[#EAEDED]">
      <div className="mx-auto max-w-7xl px-4 py-6 md:px-8">

        {/* Header */}
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-brand-gold">Admin Panel</p>
            <h1 className="mt-1 text-2xl font-extrabold text-[#131921]">Cindy Nat Enterprise</h1>
          </div>
          <button onClick={loadAll} className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
            ↻ Refresh
          </button>
        </div>

        {error && <div className="mb-4 rounded-lg bg-red-50 p-4 text-sm text-red-700">{error}</div>}

        {/* Tabs */}
        <div className="mb-6 flex overflow-x-auto rounded-lg bg-white shadow-sm">
          {TABS.map((t) => (
            <button key={t} onClick={() => { setTab(t); if (t === 'Orders') loadAll(); }}
              className={`flex-1 whitespace-nowrap px-6 py-3 text-sm font-semibold transition ${tab === t ? 'border-b-2 border-brand-gold bg-white text-[#131921]' : 'text-slate-500 hover:text-slate-800'}`}>
              {t}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="rounded-lg bg-white p-16 text-center text-slate-500 shadow-sm">Loading...</div>
        ) : (
          <>
            {/* ── OVERVIEW ── */}
            {tab === 'Overview' && (
              <div className="space-y-6">
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {statCards.map((s) => (
                    <div key={s.label} className={`rounded-lg p-6 shadow-sm ${s.color}`}>
                      <p className="text-3xl">{s.icon}</p>
                      <p className="mt-3 text-3xl font-extrabold">{s.value}</p>
                      <p className="mt-1 text-sm font-semibold">{s.label}</p>
                    </div>
                  ))}
                </div>

                <div className="rounded-lg bg-white p-6 shadow-sm">
                  <h2 className="mb-4 text-lg font-bold text-slate-900">⚠️ Low Stock Alerts</h2>
                  {(() => {
                    const low = products.filter((p) => Number(p.stock) <= 5);
                    return low.length === 0
                      ? <p className="text-sm text-slate-500">All products are well stocked.</p>
                      : <div className="space-y-3">{low.map((p) => (
                          <div key={p._id || p.id} className="flex items-center justify-between rounded-lg bg-red-50 px-4 py-3">
                            <p className="font-semibold text-red-800">{p.name}</p>
                            <span className="rounded-full bg-red-600 px-3 py-1 text-xs font-bold text-white">{p.stock} left</span>
                          </div>
                        ))}</div>;
                  })()}
                </div>

                <div className="rounded-lg bg-white p-6 shadow-sm">
                  <h2 className="mb-4 text-lg font-bold text-slate-900">🛒 Recent Orders</h2>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead><tr className="border-b text-left text-xs font-bold uppercase text-slate-500">
                        <th className="pb-3 pr-4">Order ID</th>
                        <th className="pb-3 pr-4">Customer</th>
                        <th className="pb-3 pr-4">Total</th>
                        <th className="pb-3">Status</th>
                      </tr></thead>
                      <tbody className="divide-y">
                        {orders.slice(0, 5).map((o) => (
                          <tr key={o._id}>
                            <td className="py-3 pr-4 font-mono text-xs">#{o._id.slice(-6).toUpperCase()}</td>
                            <td className="py-3 pr-4">{o.user?.name || 'Customer'}</td>
                            <td className="py-3 pr-4 font-semibold">₵{Number(o.totalPrice || 0).toFixed(2)}</td>
                            <td className="py-3"><span className={`rounded-full px-2 py-1 text-xs font-semibold ${STATUS_COLORS[o.status] || 'bg-slate-100 text-slate-600'}`}>{o.status}</span></td>
                          </tr>
                        ))}
                        {orders.length === 0 && <tr><td colSpan="4" className="py-6 text-center text-slate-500">No orders yet.</td></tr>}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* ── PRODUCTS ── */}
            {tab === 'Products' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-slate-600">{products.length} products total</p>
                  <button onClick={openAdd} className="rounded-full bg-brand-gold px-5 py-2 text-sm font-bold text-black hover:bg-yellow-400">
                    + Add Product
                  </button>
                </div>

                {/* Product form modal */}
                {showForm && (
                  <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 p-4 pt-8">
                    <div className="w-full max-w-xl rounded-xl bg-white p-6 shadow-2xl">
                      <h2 className="mb-5 text-xl font-bold">{editing ? 'Edit Product' : 'Add New Product'}</h2>
                      {formError && <p className="mb-4 rounded bg-red-50 p-3 text-sm text-red-700">{formError}</p>}
                      <form onSubmit={handleSave} className="space-y-4">

                        {/* Image upload section */}
                        <div>
                          <label className="mb-1.5 block text-xs font-semibold text-slate-600">Product Image</label>
                          <div className="space-y-2">
                            {/* File upload button */}
                            <button
                              type="button"
                              onClick={() => fileRef.current?.click()}
                              className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-slate-300 py-3 text-sm text-slate-500 transition hover:border-brand-gold hover:text-slate-800"
                            >
                              📁 Upload photo from your device
                            </button>
                            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImageFile} />

                            <div className="flex items-center gap-2 text-xs text-slate-400">
                              <hr className="flex-1 border-slate-200" /> or paste image URL <hr className="flex-1 border-slate-200" />
                            </div>

                            <input
                              value={form.image.startsWith('data:') ? '' : form.image}
                              onChange={(e) => {
                                const url = e.target.value;
                                // Block dangerous protocols (javascript:, data:text/html, etc.)
                                try {
                                  if (url && !url.startsWith('data:image/')) {
                                    const { protocol } = new URL(url);
                                    if (protocol !== 'https:' && protocol !== 'http:') return;
                                  }
                                } catch { /* not a full URL yet, allow typing */ }
                                setForm({ ...form, image: url });
                              }}
                              placeholder="https://example.com/image.jpg"
                              className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-brand-gold"
                            />

                            {/* Image preview */}
                            {form.image && (
                              <div className="relative">
                                <img
                                  src={form.image}
                                  alt="Preview"
                                  className="h-36 w-full rounded-lg border object-contain bg-slate-50"
                                  onError={(e) => { e.target.style.display = 'none'; }}
                                />
                                <button
                                  type="button"
                                  onClick={() => setForm({ ...form, image: '' })}
                                  className="absolute right-2 top-2 rounded-full bg-red-500 px-2 py-0.5 text-xs font-bold text-white hover:bg-red-600"
                                >
                                  ✕ Remove
                                </button>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="grid gap-4 sm:grid-cols-2">
                          <div>
                            <label className="mb-1 block text-xs font-semibold text-slate-600">Product Name *</label>
                            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Binatone Blender" className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-brand-gold" />
                          </div>
                          <div>
                            <label className="mb-1 block text-xs font-semibold text-slate-600">Category</label>
                            <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-brand-gold">
                              <option value="">Select category</option>
                              {ALL_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                            </select>
                          </div>
                          <div>
                            <label className="mb-1 block text-xs font-semibold text-slate-600">Price (₵) *</label>
                            <input type="number" min="0" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} placeholder="e.g. 320" className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-brand-gold" />
                          </div>
                          <div>
                            {editing ? (
                              <>
                                <label className="mb-1 block text-xs font-semibold text-slate-600">Current Stock</label>
                                <div className="flex items-center gap-2">
                                  <span className="rounded-lg border bg-slate-100 px-3 py-2 text-sm font-bold text-slate-700 w-full">{form.stock}</span>
                                </div>
                              </>
                            ) : (
                              <>
                                <label className="mb-1 block text-xs font-semibold text-slate-600">Stock *</label>
                                <input type="number" min="0" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} placeholder="e.g. 10" className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-brand-gold" />
                              </>
                            )}
                          </div>
                          {editing && (
                            <div className="sm:col-span-2">
                              <label className="mb-1 block text-xs font-semibold text-slate-600">Add Stock (Restock)</label>
                              <input type="number" min="1" value={form.restock} onChange={(e) => setForm({ ...form, restock: e.target.value })} placeholder="e.g. 20 — adds to current stock" className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-brand-gold" />
                              <p className="mt-1 text-xs text-slate-400">Stock only reduces automatically when customers purchase. Enter a number here to add more inventory.</p>
                            </div>
                          )}
                          <div className="sm:col-span-2">
                            <label className="mb-1 block text-xs font-semibold text-slate-600">Discount (%)</label>
                            <input type="number" min="0" max="100" value={form.discount} onChange={(e) => setForm({ ...form, discount: e.target.value })} placeholder="e.g. 10" className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-brand-gold" />
                          </div>
                          <div>
                            <label className="mb-1 block text-xs font-semibold text-slate-600">Wholesale Price (₵)</label>
                            <input type="number" min="0" value={form.wholesalePrice} onChange={(e) => setForm({ ...form, wholesalePrice: e.target.value })} placeholder="e.g. 260" className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-brand-gold" />
                          </div>
                          <div>
                            <label className="mb-1 block text-xs font-semibold text-slate-600">Min Qty for Wholesale</label>
                            <input type="number" min="1" value={form.wholesaleMinQty} onChange={(e) => setForm({ ...form, wholesaleMinQty: e.target.value })} placeholder="e.g. 5" className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-brand-gold" />
                          </div>
                        </div>

                        <div>
                          <label className="mb-1 block text-xs font-semibold text-slate-600">Description</label>
                          <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows="3" placeholder="Product description..." className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-brand-gold" />
                        </div>

                        <label className="flex items-center gap-2 text-sm">
                          <input type="checkbox" checked={form.bestseller} onChange={(e) => setForm({ ...form, bestseller: e.target.checked })} className="accent-brand-gold" />
                          Mark as Best Seller
                        </label>

                        <div className="flex gap-3 pt-2">
                          <button type="submit" disabled={saving} className="flex-1 rounded-full bg-brand-gold py-2.5 text-sm font-bold text-black hover:bg-yellow-400 disabled:opacity-60">
                            {saving ? 'Saving...' : editing ? 'Save Changes' : 'Add Product'}
                          </button>
                          <button type="button" onClick={() => setShowForm(false)} className="flex-1 rounded-full border py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                            Cancel
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                )}

                {/* Products table */}
                <div className="overflow-x-auto rounded-lg bg-white shadow-sm">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-slate-50 text-left text-xs font-bold uppercase text-slate-500">
                        <th className="px-4 py-3">Product</th>
                        <th className="px-4 py-3">Category</th>
                        <th className="px-4 py-3">Price</th>
                        <th className="px-4 py-3">Stock</th>
                        <th className="px-4 py-3">Discount</th>
                        <th className="px-4 py-3">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {products.length === 0 ? (
                        <tr><td colSpan="6" className="px-4 py-12 text-center text-slate-500">No products yet. Click "+ Add Product" to get started.</td></tr>
                      ) : products.map((p) => {
                        const imgSrc = p.images?.[0] || p.image;
                        return (
                          <tr key={p._id || p.id} className="hover:bg-slate-50">
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-3">
                                {imgSrc
                                  ? <img src={imgSrc} alt={p.name} className="h-12 w-12 rounded-lg border object-cover bg-slate-100" onError={(e) => { e.target.style.display = 'none'; }} />
                                  : <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-slate-100 text-xl">📦</div>
                                }
                                <span className="max-w-[180px] truncate font-medium text-slate-900">{p.name}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-slate-600">{p.category?.name || p.category}</td>
                            <td className="px-4 py-3 font-semibold text-slate-900">₵{Number(p.price).toFixed(2)}</td>
                            <td className="px-4 py-3">
                              <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${Number(p.stock) <= 5 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>{p.stock}</span>
                            </td>
                            <td className="px-4 py-3 text-slate-600">{p.discount || 0}%</td>
                            <td className="px-4 py-3">
                              <div className="flex gap-2">
                                <button onClick={() => openEdit(p)} className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-200">Edit</button>
                                <button onClick={() => handleDelete(p._id || p.id)} className="rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-700 hover:bg-red-200">Delete</button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ── ORDERS ── */}
            {tab === 'Orders' && (
              <div className="space-y-4">
                <p className="text-sm text-slate-600">{orders.length} total orders</p>
                <div className="overflow-x-auto rounded-lg bg-white shadow-sm">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-slate-50 text-left text-xs font-bold uppercase text-slate-500">
                        <th className="px-4 py-3">Order ID</th>
                        <th className="px-4 py-3">Customer</th>
                        <th className="px-4 py-3">Items</th>
                        <th className="px-4 py-3">Total</th>
                        <th className="px-4 py-3">Date</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3">Update</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {orders.length === 0
                        ? <tr><td colSpan="7" className="px-4 py-8 text-center text-slate-500">No orders yet.</td></tr>
                        : orders.map((o) => (
                          <tr key={o._id} className="hover:bg-slate-50">
                            <td className="px-4 py-3 font-mono text-xs font-semibold">#{o._id.slice(-6).toUpperCase()}</td>
                            <td className="px-4 py-3">{o.user?.name || 'Customer'}</td>
                            <td className="px-4 py-3">{o.orderItems?.length || 0}</td>
                            <td className="px-4 py-3 font-bold">₵{Number(o.totalPrice || 0).toFixed(2)}</td>
                            <td className="px-4 py-3 text-slate-500">{new Date(o.createdAt).toLocaleDateString()}</td>
                            <td className="px-4 py-3">
                              <span className={`rounded-full px-2 py-1 text-xs font-semibold ${STATUS_COLORS[o.status] || 'bg-slate-100 text-slate-600'}`}>{o.status}</span>
                            </td>
                            <td className="px-4 py-3">
                              <select value={o.status} disabled={updatingOrder === o._id}
                                onChange={(e) => handleOrderStatus(o._id, e.target.value)}
                                className="rounded-lg border px-2 py-1 text-xs outline-none focus:border-brand-gold disabled:opacity-50">
                                {['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled'].map((s) => <option key={s}>{s}</option>)}
                              </select>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ── USERS ── */}
            {tab === 'Users' && (
              <div className="space-y-4">
                <p className="text-sm text-slate-600">{users.length} registered users</p>
                <div className="overflow-x-auto rounded-lg bg-white shadow-sm">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-slate-50 text-left text-xs font-bold uppercase text-slate-500">
                        <th className="px-4 py-3">Name</th>
                        <th className="px-4 py-3">Email</th>
                        <th className="px-4 py-3">Phone</th>
                        <th className="px-4 py-3">City</th>
                        <th className="px-4 py-3">Orders</th>
                        <th className="px-4 py-3">Role</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {users.length === 0
                        ? <tr><td colSpan="6" className="px-4 py-8 text-center text-slate-500">No users registered yet.</td></tr>
                        : users.map((u) => (
                          <tr key={u._id} className="hover:bg-slate-50">
                            <td className="px-4 py-3 font-medium">{u.name}</td>
                            <td className="px-4 py-3 text-slate-600">{u.email}</td>
                            <td className="px-4 py-3 text-slate-600">{u.phone || '—'}</td>
                            <td className="px-4 py-3 text-slate-600">{u.city || '—'}</td>
                            <td className="px-4 py-3">{u.orders?.length || 0}</td>
                            <td className="px-4 py-3">
                              <span className={`rounded-full px-2 py-1 text-xs font-semibold ${u.isAdmin ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-600'}`}>
                                {u.isAdmin ? 'Admin' : 'Customer'}
                              </span>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ── PROMOS ── */}
            {tab === 'Promos' && (
              <div className="space-y-6">
                {/* Create form */}
                <div className="rounded-lg bg-white p-6 shadow-sm">
                  <h2 className="mb-4 text-lg font-bold text-slate-900">Create Promo Code</h2>
                  {promoError && <p className="mb-4 rounded bg-red-50 p-3 text-sm text-red-700">{promoError}</p>}
                  <form onSubmit={handlePromoSave} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-slate-600">Code *</label>
                      <input
                        value={promoForm.code}
                        onChange={(e) => setPromoForm({ ...promoForm, code: e.target.value.toUpperCase() })}
                        placeholder="e.g. SAVE20"
                        className="w-full rounded-lg border px-3 py-2 text-sm font-mono outline-none focus:border-brand-gold"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-slate-600">Discount Type</label>
                      <select
                        value={promoForm.discountType}
                        onChange={(e) => setPromoForm({ ...promoForm, discountType: e.target.value })}
                        className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-brand-gold"
                      >
                        <option value="percent">Percentage (%)</option>
                        <option value="fixed">Fixed amount (₵)</option>
                      </select>
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-slate-600">
                        Discount Value * {promoForm.discountType === 'percent' ? '(%)' : '(₵)'}
                      </label>
                      <input
                        type="number" min="0"
                        value={promoForm.discountValue}
                        onChange={(e) => setPromoForm({ ...promoForm, discountValue: e.target.value })}
                        placeholder={promoForm.discountType === 'percent' ? 'e.g. 15' : 'e.g. 20'}
                        className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-brand-gold"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-slate-600">Min. Order (₵)</label>
                      <input
                        type="number" min="0"
                        value={promoForm.minAmount}
                        onChange={(e) => setPromoForm({ ...promoForm, minAmount: e.target.value })}
                        placeholder="e.g. 100 (optional)"
                        className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-brand-gold"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-slate-600">Expiry Date</label>
                      <input
                        type="date"
                        value={promoForm.expiresAt}
                        onChange={(e) => setPromoForm({ ...promoForm, expiresAt: e.target.value })}
                        className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-brand-gold"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-slate-600">Description</label>
                      <input
                        value={promoForm.description}
                        onChange={(e) => setPromoForm({ ...promoForm, description: e.target.value })}
                        placeholder="Internal note (optional)"
                        className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-brand-gold"
                      />
                    </div>
                    <div className="flex items-end sm:col-span-2 lg:col-span-3">
                      <button
                        type="submit"
                        disabled={savingPromo}
                        className="rounded-full bg-brand-gold px-6 py-2.5 text-sm font-bold text-black hover:bg-yellow-400 disabled:opacity-60"
                      >
                        {savingPromo ? 'Creating...' : '+ Create Promo'}
                      </button>
                    </div>
                  </form>
                </div>

                {/* Existing promos */}
                <div className="overflow-x-auto rounded-lg bg-white shadow-sm">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-slate-50 text-left text-xs font-bold uppercase text-slate-500">
                        <th className="px-4 py-3">Code</th>
                        <th className="px-4 py-3">Discount</th>
                        <th className="px-4 py-3">Min Order</th>
                        <th className="px-4 py-3">Expires</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {promos.length === 0
                        ? <tr><td colSpan="6" className="px-4 py-8 text-center text-slate-500">No promo codes yet. Create one above.</td></tr>
                        : promos.map((p) => {
                          const expired = p.expiresAt && new Date(p.expiresAt) < new Date();
                          return (
                            <tr key={p._id} className="hover:bg-slate-50">
                              <td className="px-4 py-3 font-mono font-bold text-slate-900">{p.code}</td>
                              <td className="px-4 py-3 font-semibold text-emerald-700">
                                {p.discountType === 'percent' ? `${p.discountValue}% off` : `₵${p.discountValue} off`}
                              </td>
                              <td className="px-4 py-3 text-slate-600">{p.minAmount ? `₵${p.minAmount}` : '—'}</td>
                              <td className="px-4 py-3 text-slate-600">
                                {p.expiresAt ? new Date(p.expiresAt).toLocaleDateString() : 'No expiry'}
                              </td>
                              <td className="px-4 py-3">
                                <span className={`rounded-full px-2 py-1 text-xs font-semibold ${expired ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                                  {expired ? 'Expired' : 'Active'}
                                </span>
                              </td>
                              <td className="px-4 py-3">
                                <button
                                  onClick={() => handlePromoDelete(p._id, p.code)}
                                  className="rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-700 hover:bg-red-200"
                                >
                                  Delete
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
