// Auth tokens now live in an httpOnly cookie set by the backend at login.
// JavaScript can no longer read or write them — so XSS in the SPA can no
// longer exfiltrate a session. The localStorage entries below are just
// non-sensitive UI flags ("am I signed in? what's my name?") used to render
// the correct nav / dashboard without an extra /profile request on boot.

import { logoutUser } from './api';

export const AUTH_USER_KEY = 'cindyNutUser';
export const ADMIN_USER_KEY = 'cindyNutAdminUser';
export const ADMIN_SESSION_KEY = 'cindyNutAdminSession';

export const getAuthUser = () => {
  const user = localStorage.getItem(AUTH_USER_KEY);
  return user ? JSON.parse(user) : null;
};

export const getAdminUser = () => {
  const admin = localStorage.getItem(ADMIN_USER_KEY);
  return admin ? JSON.parse(admin) : null;
};

export const isAuthenticated = () => Boolean(getAuthUser());
export const isAdmin = () => Boolean(getAdminUser());

export const saveAuthUser = (user) => {
  localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
};

export const saveAdminUser = (admin) => {
  localStorage.setItem(ADMIN_USER_KEY, JSON.stringify(admin));
};

export const getAdminSessionId = () => localStorage.getItem(ADMIN_SESSION_KEY);
export const saveAdminSessionId = (id) => localStorage.setItem(ADMIN_SESSION_KEY, String(id));

// Kept as no-ops so existing call sites compile during the cookie migration.
// The cookie is set/cleared by the backend, not by the SPA.
export const getToken = () => '';
export const getAdminToken = () => '';
export const saveToken = () => {};
export const saveAdminToken = () => {};

// Clears the server-side cookie AND the local UI flags. Fire-and-forget on
// the network call — if it fails we still wipe the local state so the user
// is logged out from this device either way.
export const logout = async () => {
  try { await logoutUser(); } catch { /* network failure is OK — keep clearing */ }
  localStorage.removeItem(AUTH_USER_KEY);
  localStorage.removeItem(ADMIN_USER_KEY);
  localStorage.removeItem(ADMIN_SESSION_KEY);
};
