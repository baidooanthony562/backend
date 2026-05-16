import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getAuthUser, getToken, isAuthenticated } from '../utils/auth';
import { fetchUserOrders, fetchUserProfile, updateUserProfile, changeUserPassword } from '../utils/api';
import { getWishlist, removeFromWishlist } from '../utils/wishlist';
import { showToast } from '../components/Toast';

function Field({ label, value, onChange, type = 'text', placeholder = '' }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-semibold text-slate-500 uppercase tracking-wide">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none focus:border-brand-gold focus:bg-white"
      />
    </div>
  );
}

export default function UserDashboard() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(getAuthUser());
  const [orders, setOrders] = useState([]);
  const [wishlist, setWishlist] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const token = getToken();

  // Edit profile state
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({ name: '', phone: '', address: '', city: '', country: '' });
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileError, setProfileError] = useState('');

  // Change password state
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);

  useEffect(() => {
    if (!isAuthenticated()) { navigate('/login'); return; }
    const loadData = async () => {
      setLoading(true);
      setWishlist(getWishlist());
      try {
        const [profileRes, ordersRes] = await Promise.all([
          fetchUserProfile(token),
          fetchUserOrders(token),
        ]);
        setProfile(profileRes.data);
        setOrders(ordersRes.data);
      } catch (err) {
        setError(err.response?.data?.message || 'Unable to load profile — showing local data.');
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [navigate, token]);

  const openEditProfile = () => {
    setProfileForm({
      name: profile?.name || '',
      phone: profile?.phone || '',
      address: profile?.address || '',
      city: profile?.city || '',
      country: profile?.country || '',
    });
    setProfileError('');
    setEditingProfile(true);
  };

  const handleSaveProfile = async () => {
    if (!profileForm.name.trim()) { setProfileError('Name is required'); return; }
    setProfileSaving(true);
    setProfileError('');
    try {
      const { data } = await updateUserProfile(profileForm, token);
      setProfile(data);
      // Update localStorage so header/nav reflects new name immediately
      const stored = JSON.parse(localStorage.getItem('cindyNutUser') || '{}');
      localStorage.setItem('cindyNutUser', JSON.stringify({ ...stored, ...data }));
      window.dispatchEvent(new Event('storage'));
      setEditingProfile(false);
      showToast('Profile updated successfully');
    } catch (err) {
      setProfileError(err.response?.data?.message || 'Failed to update profile');
    } finally {
      setProfileSaving(false);
    }
  };

  const handleChangePassword = async () => {
    const { currentPassword, newPassword, confirmPassword } = passwordForm;
    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError('All fields are required');
      return;
    }
    if (newPassword.length < 8) {
      setPasswordError('New password must be at least 8 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match');
      return;
    }
    setPasswordSaving(true);
    setPasswordError('');
    try {
      await changeUserPassword({ currentPassword, newPassword }, token);
      setChangingPassword(false);
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      showToast('Password changed successfully');
    } catch (err) {
      setPasswordError(err.response?.data?.message || 'Failed to change password');
    } finally {
      setPasswordSaving(false);
    }
  };

  const handleRemoveWishlist = (productId) => {
    setWishlist(removeFromWishlist(productId));
  };

  return (
    <section className="mx-auto max-w-6xl px-4 pb-20 pt-6 md:px-8">
      <div className="mb-5">
        <p className="text-xs font-bold uppercase tracking-widest text-brand-gold">My Account</p>
        <h1 className="mt-1 text-2xl font-bold text-slate-900">Welcome back, {profile?.name || 'Customer'}</h1>
      </div>

        {error && <div className="mb-4 rounded-xl bg-rose-50 p-4 text-sm text-rose-700">{error}</div>}

        {/* Profile details + Edit */}
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900">Profile Details</h2>
              {!editingProfile && (
                <button
                  onClick={openEditProfile}
                  className="rounded-full border border-slate-200 bg-white px-4 py-1.5 text-xs font-semibold text-slate-700 hover:border-brand-gold hover:text-brand-dark transition"
                >
                  Edit
                </button>
              )}
            </div>

            {editingProfile ? (
              <div className="mt-4 space-y-3">
                {profileError && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{profileError}</p>}
                <Field label="Full name" value={profileForm.name} onChange={(v) => setProfileForm({ ...profileForm, name: v })} placeholder="Your name" />
                <Field label="Phone" value={profileForm.phone} onChange={(v) => setProfileForm({ ...profileForm, phone: v })} placeholder="+233 xx xxx xxxx" />
                <Field label="Address" value={profileForm.address} onChange={(v) => setProfileForm({ ...profileForm, address: v })} placeholder="Street address" />
                <Field label="City" value={profileForm.city} onChange={(v) => setProfileForm({ ...profileForm, city: v })} placeholder="City" />
                <Field label="Country" value={profileForm.country} onChange={(v) => setProfileForm({ ...profileForm, country: v })} placeholder="Country" />
                <div className="flex gap-3 pt-1">
                  <button
                    onClick={handleSaveProfile}
                    disabled={profileSaving}
                    className="rounded-full bg-brand-gold px-5 py-2 text-sm font-bold text-black hover:bg-yellow-400 disabled:opacity-60 transition"
                  >
                    {profileSaving ? 'Saving...' : 'Save changes'}
                  </button>
                  <button
                    onClick={() => setEditingProfile(false)}
                    className="rounded-full border border-slate-200 px-5 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 transition"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-4 space-y-2 text-sm text-slate-600">
                <p><span className="font-medium text-slate-800">Name:</span> {profile?.name || 'N/A'}</p>
                <p><span className="font-medium text-slate-800">Email:</span> {profile?.email || 'N/A'}</p>
                <p><span className="font-medium text-slate-800">Phone:</span> {profile?.phone || 'Not set'}</p>
                <p><span className="font-medium text-slate-800">Address:</span> {profile?.address || 'Not set'}</p>
                <p><span className="font-medium text-slate-800">City:</span> {profile?.city || 'Not set'}</p>
                <p><span className="font-medium text-slate-800">Country:</span> {profile?.country || 'Not set'}</p>
              </div>
            )}
          </div>

          {/* Change password */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900">Password</h2>
              {!changingPassword && (
                <button
                  onClick={() => { setChangingPassword(true); setPasswordError(''); }}
                  className="rounded-full border border-slate-200 bg-white px-4 py-1.5 text-xs font-semibold text-slate-700 hover:border-brand-gold hover:text-brand-dark transition"
                >
                  Change
                </button>
              )}
            </div>

            {changingPassword ? (
              <div className="mt-4 space-y-3">
                {passwordError && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{passwordError}</p>}

                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-500 uppercase tracking-wide">Current password</label>
                  <div className="relative">
                    <input
                      type={showCurrent ? 'text' : 'password'}
                      value={passwordForm.currentPassword}
                      onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                      placeholder="••••••••"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 pr-10 text-sm outline-none focus:border-brand-gold focus:bg-white"
                    />
                    <button type="button" onClick={() => setShowCurrent(!showCurrent)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                      {showCurrent ? '🙈' : '👁️'}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-500 uppercase tracking-wide">New password</label>
                  <div className="relative">
                    <input
                      type={showNew ? 'text' : 'password'}
                      value={passwordForm.newPassword}
                      onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                      placeholder="Min 8 characters"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 pr-10 text-sm outline-none focus:border-brand-gold focus:bg-white"
                    />
                    <button type="button" onClick={() => setShowNew(!showNew)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                      {showNew ? '🙈' : '👁️'}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-500 uppercase tracking-wide">Confirm new password</label>
                  <input
                    type="password"
                    value={passwordForm.confirmPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                    placeholder="Repeat new password"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none focus:border-brand-gold focus:bg-white"
                  />
                </div>

                <div className="flex gap-3 pt-1">
                  <button
                    onClick={handleChangePassword}
                    disabled={passwordSaving}
                    className="rounded-full bg-brand-gold px-5 py-2 text-sm font-bold text-black hover:bg-yellow-400 disabled:opacity-60 transition"
                  >
                    {passwordSaving ? 'Updating...' : 'Update password'}
                  </button>
                  <button
                    onClick={() => { setChangingPassword(false); setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' }); }}
                    className="rounded-full border border-slate-200 px-5 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 transition"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-4 space-y-2 text-sm text-slate-600">
                <p>Password: <span className="tracking-widest">••••••••</span></p>
                <p className="text-xs text-slate-400">Last changed: unknown. Keep your account secure by using a strong password.</p>
              </div>
            )}
          </div>
        </div>

        {/* Orders + Wishlist */}
        <div className="mt-4 grid gap-4 xl:grid-cols-[1.4fr_0.8fr]">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-base font-bold text-slate-900">Recent Orders</h2>
              <Link to="/orders" className="rounded-full border border-slate-200 bg-brand-gold px-4 py-2 text-sm font-semibold text-black transition hover:bg-yellow-400">
                View all
              </Link>
            </div>
            <div className="mt-6 space-y-4">
              {loading ? (
                <p className="text-slate-500">Loading orders...</p>
              ) : orders.length === 0 ? (
                <p className="text-slate-500">No orders yet. Start shopping to build your order history.</p>
              ) : (
                orders.slice(0, 5).map((order) => (
                  <Link key={order._id} to={`/orders/${order._id}`} className="block rounded-xl border border-slate-200 bg-slate-50 p-4 transition hover:border-brand-gold">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="font-semibold text-slate-900">Order #{order._id.slice(-6).toUpperCase()}</p>
                        <p className="text-sm text-slate-500">{new Date(order.createdAt).toLocaleDateString()}</p>
                      </div>
                      <span className="rounded-full bg-brand-gold px-3 py-1 text-sm font-semibold text-black">{order.status}</span>
                    </div>
                    <p className="mt-3 text-sm text-slate-600">Total: ₵{order.totalPrice.toFixed(2)}</p>
                  </Link>
                ))
              )}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-base font-bold text-slate-900">Wishlist</h2>
            <div className="mt-6 space-y-4">
              {loading ? (
                <p className="text-slate-500">Loading wishlist...</p>
              ) : wishlist.length === 0 ? (
                <p className="text-slate-500">Your wishlist is empty. Add items from the shop to save them.</p>
              ) : (
                wishlist.map((product) => {
                  const pid = product._id || product.id;
                  return (
                    <div key={pid} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                      <div className="flex items-center gap-3">
                        {(product.images?.[0] || product.image) && (
                          <img src={product.images?.[0] || product.image} alt={product.name} className="h-12 w-12 rounded-xl object-contain bg-white border border-slate-100" onError={(e) => { e.target.style.display = 'none'; }} />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-slate-900 truncate">{product.name}</p>
                          <p className="text-sm text-slate-500">₵{Number(product.price).toFixed(2)}</p>
                        </div>
                        <button onClick={() => handleRemoveWishlist(pid)} className="shrink-0 rounded-full bg-rose-100 px-3 py-1.5 text-sm text-rose-700 transition hover:bg-rose-200">
                          Remove
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
    </section>
  );
}
