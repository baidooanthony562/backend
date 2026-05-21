import { useEffect, useCallback } from 'react';
import { getAdminToken, getAdminSessionId, logout } from '../utils/auth';

const API = 'https://backend-9m2y.onrender.com/api';

function fireLogoutBeacon(reason) {
  const token = getAdminToken();
  const sessionId = getAdminSessionId();
  if (!token || !sessionId) return;

  fetch(`${API}/admin/logout`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ sessionId, reason }),
    keepalive: true,
  }).catch(() => {});
}

export function useAdminSessionGuard(onTerminate) {
  const terminateSession = useCallback((reason) => {
    fireLogoutBeacon(reason);
    logout();
    if (onTerminate) onTerminate(reason);
  }, [onTerminate]);

  useEffect(() => {
    const handleBeforeUnload = () => {
      fireLogoutBeacon('tab_closed');
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [terminateSession]);
}
