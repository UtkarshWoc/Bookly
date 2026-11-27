'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { authApi } from '@/lib/api/auth.api';
import { readCookie } from '@/lib/api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);

  // Restore session from the httpOnly cookie (no token ever touches localStorage).
  useEffect(() => {
    if (!readCookie('bookly_csrf')) {
      setReady(true);
      return;
    }
    authApi
      .me()
      .then(({ user: current }) => setUser(current))
      .catch(() => setUser(null))
      .finally(() => setReady(true));
  }, []);

  // Any 401 from the gateway means the session cookie is missing, expired, or revoked.
  useEffect(() => {
    const clear = () => setUser(null);
    window.addEventListener('bookly:unauthorized', clear);
    return () => window.removeEventListener('bookly:unauthorized', clear);
  }, []);

  const login = useCallback(async (credentials) => {
    const { user: next } = await authApi.login(credentials);
    setUser(next);
    return next;
  }, []);

  const register = useCallback(async (details) => {
    const { user: next } = await authApi.register(details);
    setUser(next);
    return next;
  }, []);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } finally {
      setUser(null);
    }
  }, []);

  const value = useMemo(
    () => ({
      ready,
      user,
      isAdmin: user?.role === 'admin',
      login,
      register,
      logout,
    }),
    [ready, user, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside <AuthProvider>');
  return context;
}
