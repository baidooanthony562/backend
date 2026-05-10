import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchDashboard } from '../utils/api';
import { isAdmin, getAdminToken } from '../utils/auth';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const adminToken = getAdminToken();

  useEffect(() => {
    if (!isAdmin()) {
      navigate('/admin/login');
      return;
    }
    const loadDashboard = async () => {
      setLoading(true);
      try {
        const { data } = await fetchDashboard(adminToken);
        setDashboardData(data);
      } catch {
        setDashboardData(null);
      } finally {
        setLoading(false);
      }
    };
    loadDashboard();
  }, [navigate, adminToken]);

  const stats = dashboardData
    ? [
        { label: 'Total Users', value: dashboardData.totalUsers },
        { label: 'Total Products', value: dashboardData.totalProducts },
        { label: 'Total Orders', value: dashboardData.totalOrders },
        { label: 'Revenue', value: `$${Number(dashboardData.revenue).toLocaleString()}` },
      ]
    : [
        { label: 'Total Users', value: 'â€”' },
        { label: 'Total Products', value: 'â€”' },
        { label: 'Total Orders', value: 'â€”' },
        { label: 'Revenue', value: 'â€”' },
      ];

  const lowStock = dashboardData?.lowStock || [];

  const tasks = useMemo(
    () => [
      { title: 'Approve new product listing', status: 'Pending' },
      { title: 'Review payment reports', status: 'Completed' },
    ],
    []
  );

  return (
    <section className="mx-auto max-w-7xl px-4 pb-24 pt-8 md:px-8">
      <div className="mb-10 rounded-[2rem] bg-brand-dark px-8 py-10 text-white shadow-soft">
        <h1 className="text-4xl font-bold">Admin dashboard</h1>
        <p className="mt-4 max-w-2xl text-slate-200">Manage products, monitor orders, and keep the Cindy Nat Enterprise storefront running smoothly.</p>
      </div>

      <div className="mb-8 grid gap-6 md:grid-cols-4">
        {stats.map((item) => (
          <div key={item.label} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm uppercase tracking-[0.3em] text-brand-gold">{item.label}</p>
            <p className="mt-4 text-3xl font-bold text-slate-900">{loading ? '...' : item.value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
        <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-xl font-semibold text-slate-900">Inventory summary</h2>
            <div className="flex gap-2 rounded-full border border-slate-200 bg-slate-50 p-2">
              {['overview', 'orders'].map((tab) => (
                <button key={tab} onClick={() => setActiveTab(tab)} className={`rounded-full px-4 py-2 text-sm ${activeTab === tab ? 'bg-brand-dark text-white' : 'text-slate-600'}`}>
                  {tab === 'overview' ? 'Overview' : 'Orders'}
                </button>
              ))}
            </div>
          </div>
          <div className="mt-8 space-y-6">
            {activeTab === 'overview' ? (
              <div className="space-y-4">
                {loading ? (
                  <p className="text-slate-500">Loading inventory...</p>
                ) : lowStock.length === 0 ? (
                  <p className="text-slate-500">All products are well-stocked.</p>
                ) : (
                  lowStock.map((product) => (
                    <div key={product._id} className="flex items-center justify-between rounded-3xl bg-slate-50 p-5">
                      <div>
                        <p className="font-semibold text-slate-900">{product.name}</p>
                        <p className="text-sm text-slate-500">Stock: {product.stock}</p>
                      </div>
                      <span className={`rounded-full px-3 py-1 text-sm ${product.stock === 0 ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'}`}>
                        {product.stock === 0 ? 'Out of stock' : 'Low stock'}
                      </span>
                    </div>
                  ))
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {tasks.map((task) => (
                  <div key={task.title} className="rounded-3xl bg-slate-50 p-5">
                    <p className="font-semibold text-slate-900">{task.title}</p>
                    <p className="mt-2 text-sm text-slate-500">Status: {task.status}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-900">Low stock alerts</h2>
            <div className="mt-6 space-y-4">
              {loading ? (
                <p className="text-slate-500">Loading alerts...</p>
              ) : lowStock.length === 0 ? (
                <p className="text-slate-500">No low-stock alerts.</p>
              ) : (
                lowStock.map((product) => (
                  <div key={product._id} className={`rounded-3xl p-5 ${product.stock === 0 ? 'bg-rose-50' : 'bg-amber-50'}`}>
                    <p className={`font-semibold ${product.stock === 0 ? 'text-rose-700' : 'text-amber-700'}`}>{product.name}</p>
                    <p className={`text-sm ${product.stock === 0 ? 'text-rose-600' : 'text-amber-600'}`}>
                      {product.stock === 0 ? 'Out of stock. Restock immediately.' : `Only ${product.stock} unit${product.stock !== 1 ? 's' : ''} left. Restock soon.`}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-900">Admin actions</h2>
            <div className="mt-6 space-y-3">
              <button className="w-full rounded-full bg-brand-gold px-5 py-3 font-semibold text-black">Add product</button>
              <button className="w-full rounded-full border border-slate-200 px-5 py-3 text-slate-700">Manage orders</button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
