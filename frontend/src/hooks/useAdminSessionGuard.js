import { useEffect, useRef, useCallback } from 'react';
import { getAdminToken, getAdminSessionId, logout } from '../utils/auth';

const API = 'https://backend-9m2y.onrender.com/api';
const AWAY_LIMIT = 10 * 60 * 1000; // 10 minutes

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
  const hiddenAt = useRef(null);

  const terminateSession = useCallback((reason) => {
    fireLogoutBeacon(reason);
    logout();
    if (onTerminate) onTerminate(reason);
  }, [onTerminate]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        hiddenAt.current = Date.now();
      } else {
        if (hiddenAt.current !== null) {
          const elapsed = Date.now() - hiddenAt.current;
          hiddenAt.current = null;
          if (elapsed >= AWAY_LIMIT) {
            terminateSession('inactivity');
          }
        }
      }
    };

    const handleBeforeUnload = () => {
      fireLogoutBeacon('tab_closed');
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [terminateSession]);
}
