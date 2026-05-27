import { useEffect } from 'react';
import { Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import NavBar from './components/NavBar';
import Footer from './components/Footer';
import LiveChat from './components/LiveChat';
import Toast, { showToast } from './components/Toast';
import { ProtectedRoute, AdminRoute } from './components/ProtectedRoute';
import { isAdmin } from './utils/auth';
import Home from './pages/Home';
import Shop from './pages/Shop';
import ProductDetail from './pages/ProductDetail';
import Cart from './pages/Cart';
import Login from './pages/Login';
import Register from './pages/Register';
import AdminDashboard from './pages/AdminDashboard';
import AdminLogin from './pages/AdminLogin';
import UserDashboard from './pages/UserDashboard';
import OrderConfirmation from './pages/OrderConfirmation';
import OrderDetail from './pages/OrderDetail';
import OrderHistory from './pages/OrderHistory';
import ForgotPassword from './pages/ForgotPassword';
import PrivacyPolicy from './pages/PrivacyPolicy';
import Terms from './pages/Terms';
import PaymentVerify from './pages/PaymentVerify';
import NotFound from './pages/NotFound';

function App() {
  const location = useLocation();
  const navigate = useNavigate();
  // Match /admin and any /admin/<rest> path, but not a stray /adminsomething typo.
  const isAdminArea = location.pathname === '/admin' || location.pathname.startsWith('/admin/');
  const adminSignedIn = isAdmin();

  // Hard separation: while signed in as admin, the customer site is off
  // limits. Avoids the dual-identity footgun where an admin could place
  // test orders, leave items in their own cart, or see UI states that
  // don't apply to them. To browse as a customer, sign out of admin first.
  useEffect(() => {
    if (adminSignedIn && !isAdminArea) {
      showToast('Sign out of admin to browse the customer site.');
      navigate('/admin', { replace: true });
    }
  }, [adminSignedIn, isAdminArea, location.pathname, navigate]);

  return (
    <div className="min-h-screen bg-white text-slate-900">
      {!isAdminArea && <NavBar />}
      <main className={isAdminArea ? '' : 'pt-16 md:pt-28'}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/shop" element={<Shop />} />
          <Route path="/product/:id" element={<ProductDetail />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/dashboard" element={<ProtectedRoute><UserDashboard /></ProtectedRoute>} />
          <Route path="/orders" element={<ProtectedRoute><OrderHistory /></ProtectedRoute>} />
          <Route path="/order-confirmation/:id" element={<OrderConfirmation />} />
          <Route path="/orders/:id" element={<ProtectedRoute><OrderDetail /></ProtectedRoute>} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/payment/verify" element={<PaymentVerify />} />
          <Route path="/privacy-policy" element={<PrivacyPolicy />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      {!isAdminArea && <Footer />}
      {!isAdminArea && <LiveChat />}
      <Toast />
    </div>
  );
}

export default App;
