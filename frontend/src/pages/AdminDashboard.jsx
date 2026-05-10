import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  fetchDashboard, fetchAllUsers, fetchAllOrders, fetchProducts,
  updateOrderStatus, createProduct, updateProduct, deleteProduct,
} from '../utils/api';
import { isAdmin, getAdminToken } from '../utils/auth';

const TABS = ['Overview', 'Products', 'Orders', 'Users'];

const STATUS_COLORS = {
  Pending: 'bg-yellow-100 text-yellow-700',
  Processing: 'bg-blue-100 text-blue-700',
  Shipped: 'bg-purple-100 text-purple-700',
  Delivered: 'bg-green-100 text-green-700',
  Cancelled: 'bg-red-100 text-red-700',
};

const EMPTY_PRODUCT = { name: '', description: '', price: '', stock: '', discount: '0', category: '', images: [''], featured: false, bestseller: false };

export default function AdminDashboard() {
  const navigate = useNavigate();
  const token = getAdminToken();
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
  const [form, setForm] = useState(EMPTY_PRODUCT);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  // Order status update
  const [updatingOrder, setUpdatingOrder] = useState(null);

  useEffect(() => {
    if (!isAdmin()) { navigate('/admin/login'); return; }
    loadAll();
  }, [navigate]);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [dashRes, prodRes, orderRes, userRes] = await Promise.all([
        fetchDashboard(token),
        fetchProducts(),
        fetchAllOrders(token),
        fetchAllUsers(token),
      ]);
      setStats(dashRes.data);
      setProducts(prodRes.data);
      setOrders(orderRes.data);
      setUsers(userRes.data);
    } catch (e) {
      setError('Failed to load admin data. Check your connection.');
    } finally {
      setLoading(false);
    }
  };

  const openAdd = () => { setEditing(null); setForm(EMPTY_PRODUCT); setFormError(''); setShowForm(true); };
  const openEdit = (p) => {
    setEditing(p._id);
    setForm({
      name: p.name, description: p.description, price: p.price,
      stock: p.stock, discount: p.discount || 0, category: p.category?.name || p.category || '',
      images: p.images || [''], featured: p.featured || false, bestseller: p.bestseller || false,
    });
    setFormError('');
    setShowForm(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.name || !form.price || !form.stock) { setFormError('Name, price and stock are required.'); return; }
    setSaving(true);
    setFormError('');
    try {
      const payload = { ...form, price: Number(form.price), stock: Number(form.stock), discount: Number(form.discount) };
      if (editing) await updateProduct(editing, payload, token);
      else await createProduct(payload, token);
      setShowForm(false);
      const res = await fetchProducts();
      setProducts(res.data);
    } catch (e) {
      setFormError(e.response?.data?.message || 'Failed to save product.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this product? This cannot be undone.')) return;
    try {
      await deleteProduct(id, token);
      setProducts((prev) => prev.filter((p) => p._id !== id));
    } catch {
      alert('Failed to delete product.');
    }
  };

  const handleOrderStatus = async (orderId, status) => {
    setUpdatingOrder(orderId);
    try {
      await updateOrderStatus(orderId, status, token);
      setOrders((prev) => prev.map((o) => o._id === orderId ? { ...o, status } : o));
    } catch {
      alert('Failed to update order status.');
    } finally {
      setUpdatingOrder(null);
    }
  };

  const statCards = stats ? [
    { label: 'Total Users', value: stats.totalUsers, icon: '👥', color: 'bg-blue-50 text-blue-700' },
    { label: 'Total Products', value: stats.totalProducts, icon: '📦', color: 'bg-amber-50 text-amber-700' },
    { label: 'Total Orders', value: stats.totalOrders, icon: '🛒', color: 'bg-purple-50 text-purple-700' },
    { label: 'Revenue', value: `₵${Number(stats.revenue).toLocaleString()}`, icon: '💰', color: 'bg-green-50 text-green-700' },
  ] : [];

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
            <button key={t} onClick={() => setTab(t)}
              className={`flex-1 px-6 py-3 text-sm font-semibold transition whitespace-nowrap ${tab === t ? 'border-b-2 border-brand-gold bg-white text-[#131921]' : 'text-slate-500 hover:text-slate-800'}`}>
              {t}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="rounded-lg bg-white p-16 text-center text-slate-500 shadow-sm">Loading admin data...</div>
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

                {/* Low stock */}
                <div className="rounded-lg bg-white p-6 shadow-sm">
                  <h2 className="mb-4 text-lg font-bold text-slate-900">⚠️ Low Stock Alerts</h2>
                  {stats?.lowStock?.length === 0 ? (
                    <p className="text-sm text-slate-500">All products are well stocked.</p>
                  ) : (
                    <div className="space-y-3">
                      {stats?.lowStock?.map((p) => (
                        <div key={p._id} className="flex items-center justify-between rounded-lg bg-red-50 px-4 py-3">
                          <p className="font-semibold text-red-800">{p.name}</p>
                          <span className="rounded-full bg-red-600 px-3 py-1 text-xs font-bold text-white">{p.stock} left</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Recent orders */}
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
                            <td className="py-3 pr-4 font-semibold">₵{o.totalPrice?.toFixed(2)}</td>
                            <td className="py-3"><span className={`rounded-full px-2 py-1 text-xs font-semibold ${STATUS_COLORS[o.status] || 'bg-slate-100 text-slate-600'}`}>{o.status}</span></td>
                          </tr>
                        ))}
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
                  <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4 pt-10">
                    <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-2xl">
                      <h2 className="mb-5 text-xl font-bold">{editing ? 'Edit Product' : 'Add New Product'}</h2>
                      {formError && <p className="mb-4 rounded bg-red-50 p-3 text-sm text-red-700">{formError}</p>}
                      <form onSubmit={handleSave} className="space-y-4">
                        <div className="grid gap-4 sm:grid-cols-2">
                          <div>
                            <label className="mb-1 block text-xs font-semibold text-slate-600">Product Name *</label>
                            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Premium Blender" className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-brand-gold" />
                          </div>
                          <div>
                            <label className="mb-1 block text-xs font-semibold text-slate-600">Category</label>
                            <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-brand-gold">
                              <option value="">Select category</option>
                              {['Blenders', 'Rice Cookers', 'Pots & Pans', 'Tea Dispensers'].map((c) => <option key={c}>{c}</option>)}
                            </select>
                          </div>
                          <div>
                            <label className="mb-1 block text-xs font-semibold text-slate-600">Price (₵) *</label>
                            <input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} placeholder="e.g. 320" className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-brand-gold" />
                          </div>
                          <div>
                            <label className="mb-1 block text-xs font-semibold text-slate-600">Stock *</label>
                            <input type="number" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} placeholder="e.g. 10" className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-brand-gold" />
                          </div>
                          <div>
                            <label className="mb-1 block text-xs font-semibold text-slate-600">Discount (%)</label>
                            <input type="number" value={form.discount} onChange={(e) => setForm({ ...form, discount: e.target.value })} placeholder="e.g. 10" className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-brand-gold" />
                          </div>
                          <div>
                            <label className="mb-1 block text-xs font-semibold text-slate-600">Image URL</label>
                            <input value={form.images[0]} onChange={(e) => setForm({ ...form, images: [e.target.value] })} placeholder="https://..." className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-brand-gold" />
                          </div>
                        </div>
                        <div>
                          <label className="mb-1 block text-xs font-semibold text-slate-600">Description</label>
                          <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows="3" placeholder="Product description..." className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-brand-gold" />
                        </div>
                        <div className="flex gap-6">
                          <label className="flex items-center gap-2 text-sm">
                            <input type="checkbox" checked={form.featured} onChange={(e) => setForm({ ...form, featured: e.target.checked })} className="accent-brand-gold" />
                            Featured
                          </label>
                          <label className="flex items-center gap-2 text-sm">
                            <input type="checkbox" checked={form.bestseller} onChange={(e) => setForm({ ...form, bestseller: e.target.checked })} className="accent-brand-gold" />
                            Best Seller
                          </label>
                        </div>
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
                <div className="rounded-lg bg-white shadow-sm overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead><tr className="border-b bg-slate-50 text-left text-xs font-bold uppercase text-slate-500">
                      <th className="px-4 py-3">Product</th>
                      <th className="px-4 py-3">Category</th>
                      <th className="px-4 py-3">Price</th>
                      <th className="px-4 py-3">Stock</th>
                      <th className="px-4 py-3">Discount</th>
                      <th className="px-4 py-3">Actions</th>
                    </tr></thead>
                    <tbody className="divide-y">
                      {products.length === 0 ? (
                        <tr><td colSpan="6" className="px-4 py-8 text-center text-slate-500">No products yet. Add your first product.</td></tr>
                      ) : products.map((p) => (
                        <tr key={p._id} className="hover:bg-slate-50">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <img src={p.images?.[0] || p.image} alt={p.name} className="h-10 w-10 rounded object-cover" />
                              <span className="font-medium text-slate-900 line-clamp-1">{p.name}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-slate-600">{p.category?.name || p.category}</td>
                          <td className="px-4 py-3 font-semibold">₵{Number(p.price).toFixed(2)}</td>
                          <td className="px-4 py-3">
                            <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${p.stock <= 5 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>{p.stock}</span>
                          </td>
                          <td className="px-4 py-3">{p.discount || 0}%</td>
                          <td className="px-4 py-3">
                            <div className="flex gap-2">
                              <button onClick={() => openEdit(p)} className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-200">Edit</button>
                              <button onClick={() => handleDelete(p._id)} className="rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-700 hover:bg-red-200">Delete</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ── ORDERS ── */}
            {tab === 'Orders' && (
              <div className="space-y-4">
                <p className="text-sm text-slate-600">{orders.length} total orders</p>
                <div className="rounded-lg bg-white shadow-sm overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead><tr className="border-b bg-slate-50 text-left text-xs font-bold uppercase text-slate-500">
                      <th className="px-4 py-3">Order ID</th>
                      <th className="px-4 py-3">Customer</th>
                      <th className="px-4 py-3">Items</th>
                      <th className="px-4 py-3">Total</th>
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Update</th>
                    </tr></thead>
                    <tbody className="divide-y">
                      {orders.length === 0 ? (
                        <tr><td colSpan="7" className="px-4 py-8 text-center text-slate-500">No orders yet.</td></tr>
                      ) : orders.map((o) => (
                        <tr key={o._id} className="hover:bg-slate-50">
                          <td className="px-4 py-3 font-mono text-xs font-semibold">#{o._id.slice(-6).toUpperCase()}</td>
                          <td className="px-4 py-3">{o.user?.name || 'Customer'}</td>
                          <td className="px-4 py-3">{o.orderItems?.length} item{o.orderItems?.length !== 1 ? 's' : ''}</td>
                          <td className="px-4 py-3 font-bold">₵{o.totalPrice?.toFixed(2)}</td>
                          <td className="px-4 py-3 text-slate-500">{new Date(o.createdAt).toLocaleDateString()}</td>
                          <td className="px-4 py-3">
                            <span className={`rounded-full px-2 py-1 text-xs font-semibold ${STATUS_COLORS[o.status] || 'bg-slate-100 text-slate-600'}`}>{o.status}</span>
                          </td>
                          <td className="px-4 py-3">
                            <select
                              value={o.status}
                              disabled={updatingOrder === o._id}
                              onChange={(e) => handleOrderStatus(o._id, e.target.value)}
                              className="rounded-lg border px-2 py-1 text-xs outline-none focus:border-brand-gold disabled:opacity-50"
                            >
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
                <div className="rounded-lg bg-white shadow-sm overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead><tr className="border-b bg-slate-50 text-left text-xs font-bold uppercase text-slate-500">
                      <th className="px-4 py-3">Name</th>
                      <th className="px-4 py-3">Email</th>
                      <th className="px-4 py-3">Phone</th>
                      <th className="px-4 py-3">City</th>
                      <th className="px-4 py-3">Orders</th>
                      <th className="px-4 py-3">Role</th>
                    </tr></thead>
                    <tbody className="divide-y">
                      {users.length === 0 ? (
                        <tr><td colSpan="6" className="px-4 py-8 text-center text-slate-500">No users registered yet.</td></tr>
                      ) : users.map((u) => (
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
          </>
        )}
      </div>
    </div>
  );
}
