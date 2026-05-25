import { useEffect, useCallback } from 'react';
import { getAdminSessionId, logout } from '../utils/auth';

const API = 'https://backend-9m2y.onrender.com/api';

function fireLogoutBeacon(reason) {
  const sessionId = getAdminSessionId();
  if (!sessionId) return;

  // keepalive lets the request outlive the page unload; credentials sends
  // the httpOnly auth cookie so the backend can authorise the logout.
  fetch(`${API}/admin/logout`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
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
