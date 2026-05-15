export const AUTH_USER_KEY = 'cindyNutUser';
export const AUTH_TOKEN_KEY = 'cindyNutToken';
export const ADMIN_TOKEN_KEY = 'cindyNutAdminToken';

export const getAuthUser = () => {
  const user = localStorage.getItem(AUTH_USER_KEY);
  return user ? JSON.parse(user) : null;
};

export const getToken = () => localStorage.getItem(AUTH_TOKEN_KEY);
export const getAdminToken = () => localStorage.getItem(ADMIN_TOKEN_KEY);

export const isAuthenticated = () => Boolean(getToken());
export const isAdmin = () => Boolean(getAdminToken());

export const saveAuthUser = (user) => {
  localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
};

export const saveToken = (token) => {
  localStorage.setItem(AUTH_TOKEN_KEY, token);
};

export const saveAdminToken = (token) => {
  localStorage.setItem(ADMIN_TOKEN_KEY, token);
};

export const ADMIN_SESSION_KEY = 'cindyNutAdminSession';
export const getAdminSessionId = () => localStorage.getItem(ADMIN_SESSION_KEY);
export const saveAdminSessionId = (id) => localStorage.setItem(ADMIN_SESSION_KEY, String(id));

export const logout = () => {
  localStorage.removeItem(AUTH_TOKEN_KEY);
  localStorage.removeItem(AUTH_USER_KEY);
  localStorage.removeItem(ADMIN_TOKEN_KEY);
  localStorage.removeItem(ADMIN_SESSION_KEY);
};
