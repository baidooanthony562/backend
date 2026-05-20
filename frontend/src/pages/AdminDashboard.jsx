import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  fetchDashboard, fetchAllUsers, fetchAllOrders, fetchProducts,
  updateOrderStatus, createProduct, updateProduct, deleteProduct,
  fetchPromos, createPromoAdmin, deletePromoAdmin,
  adminLogout, fetchAdminSessions, fetchDailySales,
} from '../utils/api';
import { isAdmin, getAdminToken, getAdminSessionId, logout } from '../utils/auth';
import { getProducts, saveProducts } from '../utils/productStore';
import { showToast } from '../components/Toast';
import { useAdminSessionGuard } from '../hooks/useAdminSessionGuard';

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

  // Sessions
  const [sessions, setSessions] = useState([]);
  const [now, setNow] = useState(Date.now());

  // Daily sales
  const [dailySales, setDailySales] = useState([]);
  const [salesRange, setSalesRange] = useState(30);

  // Order filters + bulk
  const [orderSearch, setOrderSearch] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState('');
  const [selectedOrders, setSelectedOrders] = useState(new Set());
  const [bulkStatus, setBulkStatus] = useState('');
  const [bulkUpdating, setBulkUpdating] = useState(false);

  // Session termination
  const [terminated, setTerminated] = useState(false);

  useAdminSessionGuard((reason) => {
    setTerminated(reason);
  });

  useEffect(() => {
    if (!isAdmin()) { navigate('/admin/login'); return; }
    loadAll();
    // Live clock — updates relative timestamps every 30s
    const tick = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(tick);
  }, [navigate]);

  const loadAll = async () => {
    setLoading(true);
    setError('');
    try {
      const [dashRes, prodRes, orderRes, userRes, promoRes, sessionRes, salesRes] = await Promise.all([
        fetchDashboard(token),
        fetchProducts(),
        fetchAllOrders(token),
        fetchAllUsers(token),
        fetchPromos(token),
        fetchAdminSessions(token),
        fetchDailySales(token, salesRange),
      ]);
      setStats(dashRes.data);
      saveProducts(prodRes.data);
      setProducts(prodRes.data);
      setOrders(orderRes.data);
      setUsers(userRes.data);
      setPromos(promoRes.data);
      setSessions(sessionRes.data);
      setDailySales(salesRes.data);
    } catch {
      setProducts(getProducts());
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await adminLogout(getAdminSessionId(), token);
    } catch { /* logout proceeds regardless */ }
    logout();
    navigate('/admin/login');
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
      category: p.category?.name || p.category || '',
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
    const snapshot = orders;
    setOrders((prev) => prev.map((o) => o._id === orderId ? { ...o, status } : o));
    setUpdatingOrder(orderId);
    try {
      const { data } = await updateOrderStatus(orderId, status, token);
      if (data?.deleted) {
        // Order was cancelled and cleared — remove from list entirely
        setOrders((prev) => prev.filter((o) => o._id !== orderId));
        showToast('Order cancelled and cleared.');
      } else {
        showToast(`Order status updated to ${status}.`);
      }
    } catch (err) {
      setOrders(snapshot);
      showToast(err.response?.data?.message || 'Failed to update order status.', 'error');
    } finally {
      setUpdatingOrder(null);
    }
  };

  const handleBulkStatus = async () => {
    if (!bulkStatus || selectedOrders.size === 0) return;
    setBulkUpdating(true);
    const ids = [...selectedOrders];
    let failed = 0;
    for (const orderId of ids) {
      try {
        const { data } = await updateOrderStatus(orderId, bulkStatus, token);
        if (data?.deleted) {
          setOrders((prev) => prev.filter((o) => o._id !== orderId));
        } else {
          setOrders((prev) => prev.map((o) => o._id === orderId ? { ...o, status: bulkStatus } : o));
        }
      } catch {
        failed++;
      }
    }
    setSelectedOrders(new Set());
    setBulkStatus('');
    setBulkUpdating(false);
    if (failed > 0) showToast(`${ids.length - failed} updated, ${failed} failed.`, 'error');
    else showToast(`${ids.length} order${ids.length > 1 ? 's' : ''} updated to ${bulkStatus}.`);
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

  const timeAgo = (date) => {
    const diff = Math.floor((now - new Date(date)) / 1000);
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return new Date(date).toLocaleDateString();
  };

  const formatSessionTime = (date) =>
    new Date(date).toLocaleString(undefined, {
      weekday: 'short', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });

  const shopAlert = (() => {
    const h = new Date(now).getHours();
    const m = new Date(now).getMinutes();
    const time = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    if (h < 8) return { type: 'info', msg: `Shop opens at 8:00 AM — current time is ${time}` };
    if (h >= 18) return { type: 'closed', msg: `Shop is closed (past 6:00 PM) — current time is ${time}. Remember to lock up!` };
    if (h >= 17) return { type: 'warn', msg: `Approaching closing time — shop closes at 6:00 PM. Current time: ${time}` };
    return null;
  })();

  const duration = (login, logout) => {
    if (!logout) return null;
    const diff = Math.floor((new Date(logout) - new Date(login)) / 1000);
    if (diff < 60) return `${diff}s`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m`;
    return `${Math.floor(diff / 3600)}h ${Math.floor((diff % 3600) / 60)}m`;
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

      {/* Session terminated overlay */}
      {terminated && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="mx-4 w-full max-w-sm rounded-2xl bg-white p-8 text-center shadow-2xl">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100 text-3xl">
              🔒
            </div>
            <h2 className="text-xl font-extrabold text-slate-900">Session Terminated</h2>
            <p className="mt-2 text-sm text-slate-500">
              {terminated === 'inactivity'
                ? 'You were away for more than 10 minutes. Your admin session has been ended for security.'
                : 'Your session was ended because the admin tab was closed.'}
            </p>
            <button
              onClick={() => navigate('/admin/login')}
              className="mt-6 w-full rounded-full bg-brand-gold py-3 text-sm font-extrabold text-black hover:bg-yellow-400 transition"
            >
              Sign in again
            </button>
          </div>
        </div>
      )}

      <div className="mx-auto max-w-7xl px-4 py-6 md:px-8">

        {/* Header */}
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-brand-gold">Admin Panel</p>
            <h1 className="mt-1 text-2xl font-extrabold text-[#131921]">Cindy Nat Enterprise</h1>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={loadAll} className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
              ↻ Refresh
            </button>
            <button
              onClick={handleLogout}
              className="rounded-full border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-100 transition"
            >
              Sign Out
            </button>
          </div>
        </div>

        {shopAlert && (
          <div className={`mb-4 flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-semibold ${
            shopAlert.type === 'closed' ? 'bg-red-100 text-red-800' :
            shopAlert.type === 'warn'   ? 'bg-amber-100 text-amber-800' :
                                          'bg-blue-50 text-blue-700'
          }`}>
            <span className="text-lg">
              {shopAlert.type === 'closed' ? '🔒' : shopAlert.type === 'warn' ? '⏰' : 'ℹ️'}
            </span>
            {shopAlert.msg}
          </div>
        )}

        {error && <div className="mb-4 rounded-lg bg-red-50 p-4 text-sm text-red-700">{error}</div>}

        {/* Tabs */}
        {(() => {
          const TAB_ICONS = { Overview: '📊', Products: '📦', Orders: '🛒', Users: '👥', Promos: '🎟️' };
          return (
            <div className="mb-6 flex overflow-x-auto rounded-lg bg-white shadow-sm">
              {TABS.map((t) => (
                <button key={t} onClick={() => { setTab(t); if (t === 'Orders') loadAll(); }}
                  className={`flex flex-1 flex-col items-center justify-center gap-0.5 whitespace-nowrap px-2 py-2.5 sm:flex-row sm:gap-1.5 sm:px-5 sm:py-3 text-xs sm:text-sm font-semibold transition ${tab === t ? 'border-b-2 border-brand-gold bg-white text-[#131921]' : 'text-slate-500 hover:text-slate-800'}`}>
                  <span className="text-base sm:text-sm leading-none">{TAB_ICONS[t]}</span>
                  <span>{t}</span>
                </button>
              ))}
            </div>
          );
        })()}

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

                {/* ── TODAY'S CONFIRMED PURCHASES ── */}
                {(() => {
                  const todayStr = new Date().toISOString().slice(0, 10);
                  const todayConfirmed = orders.filter((o) => {
                    const updated = new Date(o.updatedAt).toISOString().slice(0, 10);
                    return updated === todayStr && o.status === 'Delivered';
                  }).sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
                  const todayRevenue = todayConfirmed.reduce((s, o) => s + (o.totalPrice || 0), 0);

                  return (
                    <div className="rounded-lg bg-white p-6 shadow-sm">
                      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                        <h2 className="text-lg font-bold text-slate-900">
                          ✅ Today's Delivered Orders
                          <span className="ml-2 text-sm font-normal text-slate-500">
                            {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
                          </span>
                        </h2>
                        <div className="flex gap-3">
                          <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-bold text-green-700">
                            {todayConfirmed.length} order{todayConfirmed.length !== 1 ? 's' : ''}
                          </span>
                          <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-700">
                            ₵{todayRevenue.toFixed(2)}
                          </span>
                        </div>
                      </div>

                      {todayConfirmed.length === 0 ? (
                        <p className="text-sm text-slate-500">No delivered orders yet today. Orders will appear here once you mark them as Delivered.</p>
                      ) : (
                        <>
                          {/* Mobile cards */}
                          <div className="space-y-3 md:hidden">
                            {todayConfirmed.map((o) => (
                              <div key={o._id} className="rounded-lg border border-green-100 bg-green-50 p-3">
                                <div className="flex items-center justify-between">
                                  <span className="font-mono text-xs font-bold text-slate-700">#{o._id.slice(-6).toUpperCase()}</span>
                                  <span className="text-xs text-slate-400">{new Date(o.updatedAt).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}</span>
                                </div>
                                <p className="mt-1 font-medium text-slate-800">{o.user?.name || o.guestName || 'Guest'}</p>
                                <div className="mt-1 text-xs text-slate-500">
                                  {o.orderItems?.slice(0, 2).map((item, i) => (
                                    <span key={i} className="mr-2">{item.name} × {item.quantity}</span>
                                  ))}
                                  {o.orderItems?.length > 2 && <span>+{o.orderItems.length - 2} more</span>}
                                </div>
                                <p className="mt-1 text-right font-bold text-slate-900">₵{Number(o.totalPrice).toFixed(2)}</p>
                              </div>
                            ))}
                          </div>

                          {/* Desktop table */}
                          <div className="hidden md:block overflow-x-auto">
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="border-b text-left text-xs font-bold uppercase text-slate-500">
                                  <th className="pb-2 pr-4">Order ID</th>
                                  <th className="pb-2 pr-4">Customer</th>
                                  <th className="pb-2 pr-4">Items</th>
                                  <th className="pb-2 pr-4 text-right">Total</th>
                                  <th className="pb-2 pr-4">Status</th>
                                  <th className="pb-2">Time</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y">
                                {todayConfirmed.map((o) => (
                                  <tr key={o._id} className="hover:bg-slate-50">
                                    <td className="py-3 pr-4 font-mono text-xs font-semibold text-slate-700">#{o._id.slice(-6).toUpperCase()}</td>
                                    <td className="py-3 pr-4 text-slate-700">
                                      {o.user?.name || o.guestName || 'Guest'}
                                      {(o.user?.email || o.guestEmail) && (
                                        <span className="block text-xs text-slate-400">{o.user?.email || o.guestEmail}</span>
                                      )}
                                    </td>
                                    <td className="py-3 pr-4 text-slate-600">
                                      {o.orderItems?.slice(0, 2).map((item, i) => (
                                        <span key={i} className="block text-xs">{item.name} × {item.quantity}</span>
                                      ))}
                                      {o.orderItems?.length > 2 && <span className="text-xs text-slate-400">+{o.orderItems.length - 2} more</span>}
                                    </td>
                                    <td className="py-3 pr-4 text-right font-semibold text-slate-900">₵{Number(o.totalPrice).toFixed(2)}</td>
                                    <td className="py-3 pr-4">
                                      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_COLORS[o.status] || 'bg-slate-100 text-slate-600'}`}>{o.status}</span>
                                    </td>
                                    <td className="py-3 text-xs text-slate-500">
                                      {new Date(o.updatedAt).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </>
                      )}
                    </div>
                  );
                })()}

                {/* ── DAILY SALES ── */}
                <div className="rounded-lg bg-white p-6 shadow-sm">
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                    <h2 className="text-lg font-bold text-slate-900">📈 Daily Sales</h2>
                    <div className="flex gap-2">
                      {[7, 14, 30].map((d) => (
                        <button
                          key={d}
                          onClick={async () => {
                            setSalesRange(d);
                            try {
                              const res = await fetchDailySales(token, d);
                              setDailySales(res.data);
                            } catch { /* non-critical */ }
                          }}
                          className={`rounded-full px-3 py-1 text-xs font-semibold transition ${salesRange === d ? 'bg-brand-gold text-black' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                        >
                          {d}d
                        </button>
                      ))}
                    </div>
                  </div>

                  {dailySales.length === 0 ? (
                    <p className="text-sm text-slate-500">No sales data yet.</p>
                  ) : (() => {
                    const maxRevenue = Math.max(...dailySales.map((d) => d.revenue), 1);
                    const totalRevenue = dailySales.reduce((s, d) => s + d.revenue, 0);
                    const totalOrders = dailySales.reduce((s, d) => s + d.orders, 0);
                    const activeDays = dailySales.filter((d) => d.orders > 0).length;

                    return (
                      <>
                        {/* Summary row */}
                        <div className="mb-5 grid grid-cols-3 gap-3 text-center">
                          <div className="rounded-lg bg-green-50 px-3 py-3">
                            <p className="text-lg font-extrabold text-green-700">₵{totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                            <p className="mt-0.5 text-xs text-green-600">Revenue</p>
                          </div>
                          <div className="rounded-lg bg-purple-50 px-3 py-3">
                            <p className="text-lg font-extrabold text-purple-700">{totalOrders}</p>
                            <p className="mt-0.5 text-xs text-purple-600">Orders</p>
                          </div>
                          <div className="rounded-lg bg-amber-50 px-3 py-3">
                            <p className="text-lg font-extrabold text-amber-700">{activeDays}</p>
                            <p className="mt-0.5 text-xs text-amber-600">Active days</p>
                          </div>
                        </div>

                        {/* Bar chart */}
                        <div className="flex items-end gap-[3px] overflow-x-auto pb-2" style={{ height: '120px' }}>
                          {dailySales.map((d) => {
                            const pct = maxRevenue > 0 ? (d.revenue / maxRevenue) * 100 : 0;
                            const label = new Date(d.date + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
                            return (
                              <div key={d.date} className="group relative flex flex-1 flex-col items-center justify-end" style={{ minWidth: '18px', height: '100%' }}>
                                <div
                                  className={`w-full rounded-t transition-all ${d.revenue > 0 ? 'bg-brand-gold' : 'bg-slate-100'}`}
                                  style={{ height: `${Math.max(pct, d.revenue > 0 ? 4 : 2)}%` }}
                                />
                                {/* Tooltip */}
                                <div className="pointer-events-none absolute bottom-full mb-1 hidden rounded bg-slate-800 px-2 py-1 text-xs text-white group-hover:block whitespace-nowrap z-10">
                                  {label}<br />₵{d.revenue.toFixed(2)}<br />{d.orders} order{d.orders !== 1 ? 's' : ''}
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {/* Table — last 7 days with sales */}
                        <div className="mt-5 overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b text-left text-xs font-bold uppercase text-slate-500">
                                <th className="pb-2 pr-4">Date</th>
                                <th className="pb-2 pr-4 text-right">Orders</th>
                                <th className="pb-2 text-right">Revenue</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y">
                              {[...dailySales].reverse().filter((d) => d.orders > 0).slice(0, 10).map((d) => (
                                <tr key={d.date}>
                                  <td className="py-2 pr-4 text-slate-700">
                                    {new Date(d.date + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                                  </td>
                                  <td className="py-2 pr-4 text-right font-semibold text-slate-800">{d.orders}</td>
                                  <td className="py-2 text-right font-semibold text-green-700">₵{d.revenue.toFixed(2)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </>
                    );
                  })()}
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

                {/* Session Log */}
                <div className="rounded-lg bg-white p-6 shadow-sm">
                  <h2 className="mb-4 text-lg font-bold text-slate-900">🔐 Admin Session Log</h2>
                  {sessions.length === 0 ? (
                    <p className="text-sm text-slate-500">No sessions recorded yet.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b text-left text-xs font-bold uppercase text-slate-500">
                            <th className="pb-3 pr-4">Admin</th>
                            <th className="pb-3 pr-4">Logged In</th>
                            <th className="pb-3 pr-4">Logged Out</th>
                            <th className="pb-3 pr-4">Duration</th>
                            <th className="pb-3">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {sessions.map((s) => {
                            const active = !s.logoutAt;
                            const dur = duration(s.loginAt, s.logoutAt);
                            return (
                              <tr key={s._id} className={active ? 'bg-green-50' : ''}>
                                <td className="py-3 pr-4 font-medium text-slate-800">{s.email}</td>
                                <td className="py-3 pr-4 text-slate-600">
                                  <span className="block text-slate-800">{formatSessionTime(s.loginAt)}</span>
                                  <span className="text-xs text-slate-400">{timeAgo(s.loginAt)}</span>
                                </td>
                                <td className="py-3 pr-4 text-slate-600">
                                  {s.logoutAt ? (
                                    <>
                                      <span className="block text-slate-800">{formatSessionTime(s.logoutAt)}</span>
                                      <span className="text-xs text-slate-400">{timeAgo(s.logoutAt)}</span>
                                    </>
                                  ) : <span className="text-slate-400">—</span>}
                                </td>
                                <td className="py-3 pr-4 text-slate-600">{dur || '—'}</td>
                                <td className="py-3">
                                  <span className={`rounded-full px-2 py-1 text-xs font-semibold ${active ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}>
                                    {active ? '● Active' : 'Ended'}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
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
                {(() => {
                  const totalStockUnits = products.reduce((s, p) => s + Number(p.stock || 0), 0);
                  const totalInventoryValue = products.reduce((s, p) => s + Number(p.price || 0) * Number(p.stock || 0), 0);
                  const totalUnitsSold = products.reduce((s, p) => s + Number(p.totalSold || 0), 0);
                  return (
                    <>
                      {products.length > 0 && (
                        <div className="grid grid-cols-3 gap-3 mb-2">
                          <div className="rounded-lg bg-slate-50 border px-4 py-3 text-center">
                            <p className="text-lg font-extrabold text-slate-800">{products.length}</p>
                            <p className="text-xs text-slate-500 mt-0.5">Products</p>
                          </div>
                          <div className="rounded-lg bg-green-50 border border-green-100 px-4 py-3 text-center">
                            <p className="text-lg font-extrabold text-green-700">{totalStockUnits.toLocaleString()}</p>
                            <p className="text-xs text-green-600 mt-0.5">Units in Stock</p>
                          </div>
                          <div className="rounded-lg bg-amber-50 border border-amber-100 px-4 py-3 text-center">
                            <p className="text-lg font-extrabold text-amber-700">₵{totalInventoryValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                            <p className="text-xs text-amber-600 mt-0.5">Total Inventory Value</p>
                          </div>
                        </div>
                      )}
                      {/* Mobile product cards */}
                      <div className="space-y-3 md:hidden">
                        {products.length === 0
                          ? <p className="rounded-lg bg-white p-6 text-center text-sm text-slate-500 shadow-sm">No products yet. Click "+ Add Product" to get started.</p>
                          : products.map((p) => {
                            const imgSrc = p.images?.[0] || p.image;
                            const totalValue = Number(p.price || 0) * Number(p.stock || 0);
                            return (
                              <div key={p._id || p.id} className="rounded-lg bg-white p-4 shadow-sm">
                                <div className="flex items-center gap-3">
                                  {imgSrc
                                    ? <img src={imgSrc} alt={p.name} className="h-14 w-14 rounded-lg border object-cover bg-slate-100 shrink-0" onError={(e) => { e.target.style.display = 'none'; }} />
                                    : <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-2xl">📦</div>
                                  }
                                  <div className="min-w-0">
                                    <p className="font-semibold text-slate-900 truncate">{p.name}</p>
                                    <p className="text-xs text-slate-500">{p.category?.name || p.category || '—'}</p>
                                  </div>
                                </div>
                                <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
                                  <div className="rounded-lg bg-slate-50 p-2">
                                    <p className="font-bold text-slate-900">₵{Number(p.price).toFixed(2)}</p>
                                    <p className="text-slate-400">Price</p>
                                  </div>
                                  <div className="rounded-lg bg-slate-50 p-2">
                                    <span className={`font-bold ${Number(p.stock) <= 5 ? 'text-red-600' : 'text-green-700'}`}>{p.stock}</span>
                                    <p className="text-slate-400">Stock</p>
                                  </div>
                                  <div className="rounded-lg bg-slate-50 p-2">
                                    <p className="font-bold text-blue-700">{p.totalSold || 0}</p>
                                    <p className="text-slate-400">Sold</p>
                                  </div>
                                </div>
                                <div className="mt-2 flex items-center justify-between rounded-lg bg-amber-50 px-3 py-1.5">
                                  <span className="text-xs text-amber-700">Total value</span>
                                  <span className="text-sm font-bold text-amber-800">₵{totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                </div>
                                <div className="mt-3 flex gap-2">
                                  <button onClick={() => openEdit(p)} className="flex-1 rounded-full bg-blue-100 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-200">Edit</button>
                                  <button onClick={() => handleDelete(p._id || p.id)} className="flex-1 rounded-full bg-red-100 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-200">Delete</button>
                                </div>
                              </div>
                            );
                          })}
                      </div>

                      {/* Desktop product table */}
                      <div className="hidden md:block overflow-x-auto rounded-lg bg-white shadow-sm">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b bg-slate-50 text-left text-xs font-bold uppercase text-slate-500">
                              <th className="px-4 py-3">Product</th>
                              <th className="px-4 py-3">Category</th>
                              <th className="px-4 py-3">Price</th>
                              <th className="px-4 py-3">Stock</th>
                              <th className="px-4 py-3">Sold</th>
                              <th className="px-4 py-3">Total Value</th>
                              <th className="px-4 py-3">Discount</th>
                              <th className="px-4 py-3">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y">
                            {products.length === 0 ? (
                              <tr><td colSpan="8" className="px-4 py-12 text-center text-slate-500">No products yet. Click "+ Add Product" to get started.</td></tr>
                            ) : products.map((p) => {
                              const imgSrc = p.images?.[0] || p.image;
                              const totalValue = Number(p.price || 0) * Number(p.stock || 0);
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
                                  <td className="px-4 py-3">
                                    <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700">{p.totalSold || 0}</span>
                                  </td>
                                  <td className="px-4 py-3 font-semibold text-slate-700">
                                    ₵{totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
                          {products.length > 0 && (
                            <tfoot>
                              <tr className="border-t-2 bg-slate-50 text-xs font-bold text-slate-600">
                                <td className="px-4 py-3 uppercase" colSpan="3">Totals</td>
                                <td className="px-4 py-3">{totalStockUnits.toLocaleString()} units</td>
                                <td className="px-4 py-3">{totalUnitsSold.toLocaleString()} sold</td>
                                <td className="px-4 py-3 text-amber-700">₵{totalInventoryValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                <td colSpan="2" />
                              </tr>
                            </tfoot>
                          )}
                        </table>
                      </div>
                    </>
                  );
                })()}
              </div>
            )}

            {/* ── ORDERS ── */}
            {tab === 'Orders' && (() => {
              const q = orderSearch.trim().toLowerCase();
              const filtered = orders.filter((o) => {
                if (o.status === 'Cancelled') return false;
                const matchSearch = !q ||
                  o._id.slice(-6).toLowerCase().includes(q) ||
                  (o.user?.name || '').toLowerCase().includes(q) ||
                  (o.user?.email || '').toLowerCase().includes(q);
                const matchStatus = !orderStatusFilter || o.status === orderStatusFilter;
                return matchSearch && matchStatus;
              });
              return (
                <div className="space-y-4">
                  <div className="flex flex-col gap-2">
                    <p className="text-sm text-slate-600">
                      {filtered.length} of {orders.length} orders
                    </p>
                    <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
                      <input
                        type="text"
                        value={orderSearch}
                        onChange={(e) => setOrderSearch(e.target.value)}
                        placeholder="Search…"
                        className="col-span-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-brand-gold sm:w-52"
                      />
                      <select
                        value={orderStatusFilter}
                        onChange={(e) => setOrderStatusFilter(e.target.value)}
                        className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-brand-gold"
                      >
                        <option value="">All statuses</option>
                        {['Pending', 'Processing', 'Shipped', 'Delivered'].map((s) => (
                          <option key={s}>{s}</option>
                        ))}
                      </select>
                      <button
                        onClick={() => {
                          const escape = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
                          const rows = [
                            ['Order ID', 'Customer', 'Email', 'Items', 'Total (₵)', 'Payment', 'Status', 'Date'].map(escape).join(','),
                            ...filtered.map((o) => [
                              o._id.slice(-6).toUpperCase(),
                              o.user?.name || o.guestName || 'Guest',
                              o.user?.email || o.guestEmail || '',
                              o.orderItems?.length || 0,
                              Number(o.totalPrice || 0).toFixed(2),
                              o.paymentMethod || '',
                              o.status || '',
                              new Date(o.createdAt).toLocaleDateString('en-GH'),
                            ].map(escape).join(',')),
                          ];
                          const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = `orders-${new Date().toISOString().slice(0, 10)}.csv`;
                          a.click();
                          URL.revokeObjectURL(url);
                        }}
                        className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 hover:border-brand-gold transition"
                      >
                        ↓ Export CSV
                      </button>
                    </div>
                  </div>
                  {selectedOrders.size > 0 && (
                    <div className="flex items-center gap-3 rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-3">
                      <span className="text-sm font-semibold text-yellow-800">{selectedOrders.size} order{selectedOrders.size > 1 ? 's' : ''} selected</span>
                      <select
                        value={bulkStatus}
                        onChange={(e) => setBulkStatus(e.target.value)}
                        className="rounded-lg border border-yellow-300 bg-white px-3 py-1.5 text-sm outline-none focus:border-brand-gold"
                      >
                        <option value="">Set status…</option>
                        {['Pending', 'Processing', 'Shipped', 'Delivered'].map((s) => <option key={s}>{s}</option>)}
                      </select>
                      <button
                        onClick={handleBulkStatus}
                        disabled={!bulkStatus || bulkUpdating}
                        className="rounded-lg bg-brand-gold px-4 py-1.5 text-sm font-semibold text-slate-900 hover:bg-yellow-400 disabled:opacity-40 disabled:cursor-not-allowed transition"
                      >
                        {bulkUpdating ? 'Updating…' : `Apply to ${selectedOrders.size}`}
                      </button>
                      <button
                        onClick={() => setSelectedOrders(new Set())}
                        className="ml-auto text-xs text-yellow-700 hover:text-yellow-900 hover:underline"
                      >
                        Clear selection
                      </button>
                    </div>
                  )}
                  {/* Mobile order cards */}
                  <div className="space-y-3 md:hidden">
                    {filtered.length === 0
                      ? <p className="rounded-lg bg-white p-6 text-center text-sm text-slate-500 shadow-sm">No orders match your search.</p>
                      : filtered.map((o) => (
                        <div key={o._id} className={`rounded-lg bg-white p-4 shadow-sm ${selectedOrders.has(o._id) ? 'ring-2 ring-brand-gold' : ''}`}>
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={selectedOrders.has(o._id)}
                                onChange={(e) => {
                                  setSelectedOrders((prev) => {
                                    const next = new Set(prev);
                                    if (e.target.checked) next.add(o._id); else next.delete(o._id);
                                    return next;
                                  });
                                }}
                                className="h-4 w-4 accent-brand-gold cursor-pointer"
                              />
                              <span className="font-mono text-xs font-bold text-slate-700">#{o._id.slice(-6).toUpperCase()}</span>
                            </div>
                            <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_COLORS[o.status] || 'bg-slate-100 text-slate-600'}`}>{o.status}</span>
                          </div>
                          <div className="mt-2 grid grid-cols-2 gap-1 text-sm">
                            <div>
                              <p className="text-xs text-slate-400">Customer</p>
                              <p className="font-medium text-slate-800 truncate">{o.user?.name || o.guestName || 'Guest'}</p>
                            </div>
                            <div>
                              <p className="text-xs text-slate-400">Total</p>
                              <p className="font-bold text-slate-900">₵{Number(o.totalPrice || 0).toFixed(2)}</p>
                            </div>
                            <div>
                              <p className="text-xs text-slate-400">Items</p>
                              <p className="text-slate-700">{o.orderItems?.length || 0}</p>
                            </div>
                            <div>
                              <p className="text-xs text-slate-400">Date</p>
                              <p className="text-slate-600">{new Date(o.createdAt).toLocaleDateString()}</p>
                            </div>
                          </div>
                          <div className="mt-3">
                            <select value={o.status} disabled={updatingOrder === o._id}
                              onChange={(e) => handleOrderStatus(o._id, e.target.value)}
                              className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-brand-gold disabled:opacity-50">
                              {['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled'].map((s) => <option key={s}>{s}</option>)}
                            </select>
                          </div>
                        </div>
                      ))}
                  </div>

                  {/* Desktop order table */}
                  <div className="hidden md:block overflow-x-auto rounded-lg bg-white shadow-sm">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-slate-50 text-left text-xs font-bold uppercase text-slate-500">
                          <th className="px-4 py-3">
                            <input
                              type="checkbox"
                              checked={filtered.length > 0 && filtered.every((o) => selectedOrders.has(o._id))}
                              onChange={(e) => {
                                if (e.target.checked) setSelectedOrders(new Set(filtered.map((o) => o._id)));
                                else setSelectedOrders(new Set());
                              }}
                              className="h-4 w-4 accent-brand-gold cursor-pointer"
                            />
                          </th>
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
                        {filtered.length === 0
                          ? <tr><td colSpan="8" className="px-4 py-8 text-center text-slate-500">No orders match your search.</td></tr>
                          : filtered.map((o) => (
                            <tr key={o._id} className={`hover:bg-slate-50 ${selectedOrders.has(o._id) ? 'bg-yellow-50' : ''}`}>
                              <td className="px-4 py-3">
                                <input
                                  type="checkbox"
                                  checked={selectedOrders.has(o._id)}
                                  onChange={(e) => {
                                    setSelectedOrders((prev) => {
                                      const next = new Set(prev);
                                      if (e.target.checked) next.add(o._id);
                                      else next.delete(o._id);
                                      return next;
                                    });
                                  }}
                                  className="h-4 w-4 accent-brand-gold cursor-pointer"
                                />
                              </td>
                              <td className="px-4 py-3 font-mono text-xs font-semibold">#{o._id.slice(-6).toUpperCase()}</td>
                              <td className="px-4 py-3">{o.user?.name || o.guestName || 'Guest'}</td>
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
              );
            })()}

            {/* ── USERS ── */}
            {tab === 'Users' && (() => {
              // Count active (non-cancelled) orders per user from the live orders list
              const orderCountByUser = {};
              orders.forEach((o) => {
                const uid = o.user?._id || o.user;
                if (uid) orderCountByUser[uid] = (orderCountByUser[uid] || 0) + 1;
              });
              return (
              <div className="space-y-4">
                <p className="text-sm text-slate-600">{users.length} registered users</p>

                {/* Mobile user cards */}
                <div className="space-y-3 md:hidden">
                  {users.length === 0
                    ? <p className="rounded-lg bg-white p-6 text-center text-sm text-slate-500 shadow-sm">No users registered yet.</p>
                    : users.map((u) => (
                      <div key={u._id} className="rounded-lg bg-white p-4 shadow-sm">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="font-semibold text-slate-900 truncate">{u.name}</p>
                            <p className="text-xs text-slate-500 truncate">{u.email}</p>
                          </div>
                          <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${u.isAdmin ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-600'}`}>
                            {u.isAdmin ? 'Admin' : 'Customer'}
                          </span>
                        </div>
                        <div className="mt-2 flex gap-4 text-xs text-slate-500">
                          <span>📞 {u.phone || '—'}</span>
                          <span>📍 {u.city || '—'}</span>
                          <span className="ml-auto font-semibold text-slate-700">{orderCountByUser[u._id] || 0} orders</span>
                        </div>
                      </div>
                    ))}
                </div>

                {/* Desktop users table */}
                <div className="hidden md:block overflow-x-auto rounded-lg bg-white shadow-sm">
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
                            <td className="px-4 py-3">{orderCountByUser[u._id] || 0}</td>
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
              );
            })()}

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
