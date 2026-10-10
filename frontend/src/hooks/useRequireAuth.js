'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

// Sends signed-out visitors to /login and brings them back afterwards.
export function useRequireAuth({ admin = false } = {}) {
  const auth = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!auth.ready) return;
    if (!auth.user) router.replace(`/login?next=${encodeURIComponent(pathname)}`);
    else if (admin && !auth.isAdmin) router.replace('/');
  }, [auth.ready, auth.user, auth.isAdmin, admin, pathname, router]);

  return { ...auth, allowed: auth.ready && !!auth.user && (!admin || auth.isAdmin) };
}
