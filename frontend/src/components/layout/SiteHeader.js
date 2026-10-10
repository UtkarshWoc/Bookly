'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { ButtonLink } from '@/components/ui/Button';
import NotificationBell from './NotificationBell';

function NavLink({ href, children, onClick }) {
  const pathname = usePathname();
  const active = href === '/' ? pathname === '/' : pathname.startsWith(href);
  return (
    <Link
      href={href}
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
      className={`rounded-full px-3.5 py-2 text-[15px] font-medium transition-colors ${
        active ? 'bg-ink text-white' : 'text-ink hover:bg-ink/5'
      }`}
    >
      {children}
    </Link>
  );
}

export function Wordmark() {
  return (
    <Link href="/" className="flex items-center gap-2 font-display text-[22px] font-bold tracking-tight">
      <svg viewBox="0 0 32 32" className="size-7" aria-hidden>
        <path fill="currentColor" d="M4 8a3 3 0 0 1 3-3h18a3 3 0 0 1 3 3v4a4 4 0 0 0 0 8v4a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3v-4a4 4 0 0 0 0-8z" />
        <path stroke="#e8a23a" strokeWidth="2" strokeDasharray="2 2" d="M20 7v18" />
      </svg>
      Bookly
    </Link>
  );
}

export default function SiteHeader() {
  const { ready, user, isAdmin, logout } = useAuth();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const close = () => setMenuOpen(false);

  const links = [
    { href: '/', label: 'Events' },
    ...(user ? [{ href: '/bookings', label: 'My tickets' }] : []),
    { href: '/explorer', label: 'API explorer' },
    ...(isAdmin ? [{ href: '/admin', label: 'Manage events' }] : []),
  ];

  const signOut = async () => {
    close();
    await logout();
    router.push('/');
  };

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-paper/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4 sm:px-6">
        <Wordmark />

        <nav aria-label="Main" className="ml-4 hidden items-center gap-1 md:flex">
          {links.map((l) => (
            <NavLink key={l.href} href={l.href}>
              {l.label}
            </NavLink>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          {ready && user && <NotificationBell />}
          {ready && user && (
            <div className="hidden items-center gap-3 md:flex">
              <span className="text-sm text-ink-soft">{user.name.split(' ')[0]}</span>
              <button type="button" onClick={signOut} className="text-sm font-semibold hover:underline">
                Sign out
              </button>
            </div>
          )}
          {ready && !user && (
            <ButtonLink href="/login" size="sm" className="hidden md:inline-flex">
              Sign in
            </ButtonLink>
          )}
          <button
            type="button"
            className="grid size-10 place-items-center rounded-full hover:bg-ink/5 md:hidden"
            onClick={() => setMenuOpen((o) => !o)}
            aria-expanded={menuOpen}
            aria-label="Menu"
          >
            <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              {menuOpen ? <path d="M6 6l12 12M18 6 6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
            </svg>
          </button>
        </div>
      </div>

      {menuOpen && (
        <nav aria-label="Mobile" className="border-t border-line px-4 py-3 md:hidden">
          <div className="flex flex-col gap-1">
            {links.map((l) => (
              <NavLink key={l.href} href={l.href} onClick={close}>
                {l.label}
              </NavLink>
            ))}
            {user ? (
              <button type="button" onClick={signOut} className="rounded-full px-3.5 py-2 text-left font-medium hover:bg-ink/5">
                Sign out ({user.name.split(' ')[0]})
              </button>
            ) : (
              <NavLink href="/login" onClick={close}>
                Sign in
              </NavLink>
            )}
          </div>
        </nav>
      )}
    </header>
  );
}
