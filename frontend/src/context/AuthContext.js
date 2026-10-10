'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { authApi } from '@/lib/api/auth.api';
import { readSession, writeSession } from '@/lib/api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [ready, setReady] = useState(false);

  const save = useCallback((next) => {
    writeSession(next);
    setSession(next);
  }, []);

  // Restore the session and confirm the token is still valid (it may have been revoked or expired).
  useEffect(() => {
    const stored = readSession();
    if (!stored) {
      setReady(true);
      return;
    }
    setSession(stored);
    authApi
      .me()
      .then(({ user }) => save({ ...stored, user }))
      .catch(() => save(null))
      .finally(() => setReady(true));
  }, [save]);

  // Any 401 from the gateway means the token is no longer usable.
  useEffect(() => {
    const clear = () => save(null);
    window.addEventListener('bookly:unauthorized', clear);
    return () => window.removeEventListener('bookly:unauthorized', clear);
  }, [save]);

  const login = useCallback(async (credentials) => {
    const { user, token, expiresAt } = await authApi.login(credentials);
    save({ user, token, expiresAt });
    return user;
  }, [save]);

  const register = useCallback(async (details) => {
    const { user, token, expiresAt } = await authApi.register(details);
    save({ user, token, expiresAt });
    return user;
  }, [save]);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } finally {
      save(null);
    }
  }, [save]);

  const value = useMemo(
    () => ({
      ready,
      user: session?.user ?? null,
      token: session?.token ?? null,
      isAdmin: session?.user?.role === 'admin',
      login,
      register,
      logout,
    }),
    [ready, session, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside <AuthProvider>');
  return context;
}
