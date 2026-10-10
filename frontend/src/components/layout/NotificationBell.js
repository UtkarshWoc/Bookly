'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { notificationsApi } from '@/lib/api/notifications.api';
import { timeAgo } from '@/lib/format';

const POLL_MS = 15000;

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState({ data: [], unread: 0 });
  const panelRef = useRef(null);

  const load = useCallback(() => {
    notificationsApi.list().then(setState).catch(() => {});
  }, []);

  useEffect(() => {
    load();
    const timer = setInterval(load, POLL_MS);
    window.addEventListener('bookly:bookings-changed', load);
    return () => {
      clearInterval(timer);
      window.removeEventListener('bookly:bookings-changed', load);
    };
  }, [load]);

  useEffect(() => {
    if (!open) return undefined;
    const close = (e) => {
      if (e.key === 'Escape' || (e.type === 'mousedown' && !panelRef.current?.contains(e.target))) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', close);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', close);
    };
  }, [open]);

  const markAll = async () => {
    await notificationsApi.markAllRead().catch(() => {});
    load();
  };

  return (
    <div className="relative" ref={panelRef}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="relative grid size-10 place-items-center rounded-full hover:bg-ink/5"
        aria-label={`Notifications${state.unread ? `, ${state.unread} unread` : ''}`}
        aria-expanded={open}
      >
        <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
          <path d="M6 9a6 6 0 1 1 12 0c0 5 2 6.5 2 6.5H4S6 14 6 9Z" strokeLinejoin="round" />
          <path d="M10 19a2 2 0 0 0 4 0" strokeLinecap="round" />
        </svg>
        {state.unread > 0 && (
          <span className="absolute top-1 right-1 grid min-w-4 place-items-center rounded-full bg-marigold px-1 text-[10px] font-bold text-ink">
            {state.unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-40 mt-2 w-[min(92vw,380px)] overflow-hidden rounded-2xl border border-line bg-card shadow-xl">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <p className="font-display font-semibold">Notifications</p>
            {state.unread > 0 && (
              <button type="button" onClick={markAll} className="text-sm font-semibold text-teal hover:underline">
                Mark all as read
              </button>
            )}
          </div>
          <ul className="max-h-96 overflow-y-auto">
            {state.data.length === 0 && (
              <li className="px-4 py-8 text-center text-sm text-ink-soft">
                Booking updates will show up here.
              </li>
            )}
            {state.data.map((n) => (
              <li key={n.id} className={`border-b border-line/70 px-4 py-3 last:border-0 ${n.read ? '' : 'bg-marigold-soft/40'}`}>
                <div className="flex items-baseline justify-between gap-3">
                  <p className="text-sm font-semibold">{n.title}</p>
                  <span className="shrink-0 text-xs text-ink-soft">{timeAgo(n.createdAt)}</span>
                </div>
                <p className="mt-0.5 text-sm text-ink-soft">{n.message}</p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
