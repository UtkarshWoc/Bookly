'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { bookingsApi } from '@/lib/api/bookings.api';
import { dateParts, formatMoney, formatTime } from '@/lib/format';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import StatusPill from '@/components/ui/StatusPill';
import { EmptyState, ErrorNotice, Spinner } from '@/components/ui/States';

const TABS = [
  { id: 'upcoming', label: 'Upcoming', match: (b) => b.status === 'CONFIRMED' && new Date(b.event.startsAt) > new Date() },
  { id: 'pending', label: 'Awaiting payment', match: (b) => b.status === 'PENDING' },
  { id: 'history', label: 'History', match: (b) => !['PENDING'].includes(b.status) && !(b.status === 'CONFIRMED' && new Date(b.event.startsAt) > new Date()) },
];

function BookingRow({ booking }) {
  const { day, month } = dateParts(booking.event.startsAt);
  const href = `/bookings/${booking.id}`;
  return (
    <li>
      <Link href={href} className="flex items-center gap-4 rounded-2xl border border-line bg-card p-3 pr-5 hover:border-ink/40">
        <div className="grid size-16 shrink-0 place-items-center rounded-xl bg-ink text-center text-white">
          <span className="font-display text-2xl leading-none font-bold text-marigold">{day}</span>
          <span className="-mt-3 text-xs">{month}</span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-lg font-semibold">{booking.event.title}</p>
          <p className="truncate text-sm text-ink-soft">
            {booking.event.venue} at {formatTime(booking.event.startsAt)} — seats {booking.seats.join(', ')}
          </p>
        </div>
        <div className="hidden flex-col items-end gap-1 sm:flex">
          <StatusPill status={booking.status} />
          <span className="text-sm font-semibold">{formatMoney(booking.amount, booking.currency)}</span>
        </div>
      </Link>
    </li>
  );
}

export default function MyTicketsPage() {
  const { allowed } = useRequireAuth();
  const [bookings, setBookings] = useState(null);
  const [error, setError] = useState(null);
  const [tab, setTab] = useState('upcoming');

  useEffect(() => {
    if (allowed) bookingsApi.list().then((r) => setBookings(r.data)).catch(setError);
  }, [allowed]);

  const groups = useMemo(
    () => Object.fromEntries(TABS.map((t) => [t.id, (bookings || []).filter(t.match)])),
    [bookings],
  );

  if (!allowed || (!bookings && !error)) return <Spinner label="Loading your tickets" />;
  if (error) return <ErrorNotice error={error} />;

  const list = groups[tab];

  return (
    <div>
      <h1 className="font-display text-4xl font-extrabold tracking-tight sm:text-5xl">My tickets</h1>

      <div role="tablist" aria-label="Booking status" className="mt-8 flex gap-1 overflow-x-auto border-b border-line">
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            type="button"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={`-mb-px shrink-0 border-b-2 px-4 py-2.5 font-semibold ${
              tab === t.id ? 'border-marigold text-ink' : 'border-transparent text-ink-soft hover:text-ink'
            }`}
          >
            {t.label} <span className="text-ink-soft">{groups[t.id].length}</span>
          </button>
        ))}
      </div>

      <div className="mt-6" role="tabpanel">
        {list.length === 0 ? (
          <EmptyState
            title={tab === 'upcoming' ? 'No upcoming tickets yet' : tab === 'pending' ? 'Nothing waiting for payment' : 'No past bookings'}
            actionHref="/"
            actionLabel="Browse events"
          >
            {tab === 'upcoming' ? 'Find an event, pick your seats, and your tickets will appear here.' : null}
          </EmptyState>
        ) : (
          <ul className="flex flex-col gap-3">
            {list.map((b) => (
              <BookingRow key={b.id} booking={b} />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
