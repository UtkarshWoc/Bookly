'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { eventsApi } from '@/lib/api/events.api';
import { bookingsApi } from '@/lib/api/bookings.api';
import { newIdempotencyKey } from '@/lib/api/client';
import { formatDateTime, formatMoney } from '@/lib/format';
import { seatsLeft, sortSeats } from '@/lib/seats';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import SeatMap from '@/components/seats/SeatMap';
import Button from '@/components/ui/Button';
import { ErrorNotice, Spinner } from '@/components/ui/States';

const MAX_SEATS = 8;
const POLL_MS = 5000;

export default function EventPage() {
  const { id } = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const { notify } = useToast();

  const [event, setEvent] = useState(null);
  const [error, setError] = useState(null);
  const [availability, setAvailability] = useState({ lockedSeats: [], bookedSeats: [] });
  const [selected, setSelected] = useState(() => new Set());
  const [holding, setHolding] = useState(false);

  useEffect(() => {
    eventsApi
      .get(id)
      .then(({ event: e }) => setEvent(e))
      .catch(setError);
  }, [id]);

  const refreshSeats = useCallback(() => {
    bookingsApi.availability(id).then(setAvailability).catch(() => {});
  }, [id]);

  // The seat map is live: poll so seats taken by others disappear while you choose.
  useEffect(() => {
    refreshSeats();
    const timer = setInterval(refreshSeats, POLL_MS);
    return () => clearInterval(timer);
  }, [refreshSeats]);

  // Drop any of your picks that someone else grabbed in the meantime.
  useEffect(() => {
    const gone = new Set([...availability.lockedSeats, ...availability.bookedSeats]);
    setSelected((current) => {
      const next = new Set([...current].filter((s) => !gone.has(s)));
      return next.size === current.size ? current : next;
    });
  }, [availability]);

  const seats = useMemo(() => sortSeats([...selected]), [selected]);
  // One key per distinct selection: a double-click or network retry cannot create two holds.
  const holdKey = useMemo(() => newIdempotencyKey('hold'), [seats.join(',')]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggle = (seat) => {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(seat)) next.delete(seat);
      else if (next.size >= MAX_SEATS) notify(`You can pick up to ${MAX_SEATS} seats per booking.`);
      else next.add(seat);
      return next;
    });
  };

  const hold = async () => {
    if (!user) {
      router.push(`/login?next=${encodeURIComponent(`/events/${id}`)}`);
      return;
    }
    setHolding(true);
    try {
      const { booking } = await bookingsApi.hold({ eventId: id, seats }, holdKey);
      window.dispatchEvent(new CustomEvent('bookly:bookings-changed'));
      router.push(`/bookings/${booking.id}`);
    } catch (err) {
      const failed = err.details?.failedSeats;
      notify(failed?.length ? `${failed.join(', ')} ${failed.length > 1 ? 'were' : 'was'} just taken. Pick another seat.` : err.message, 'error');
      refreshSeats();
      setHolding(false);
    }
  };

  if (error) return <ErrorNotice error={error} />;
  if (!event) return <Spinner label="Loading event" />;

  const total = event.price * seats.length;
  const left = seatsLeft(event, availability);

  return (
    <article>
      <Link href="/" className="text-sm font-semibold text-ink-soft hover:text-ink">
        ← All events
      </Link>

      <header className="mt-6 grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
        <div>
          <p className="font-semibold text-marigold-deep">{event.category}</p>
          <h1 className="mt-2 max-w-3xl font-display text-4xl leading-[1.02] font-extrabold tracking-tight text-balance sm:text-6xl">
            {event.title}
          </h1>
          <p className="mt-4 text-lg text-ink-soft">
            {formatDateTime(event.startsAt)} at {event.venue}, {event.city}
          </p>
        </div>
        <dl className="flex gap-8">
          <div>
            <dt className="text-sm text-ink-soft">Price per seat</dt>
            <dd className="font-display text-2xl font-bold">{formatMoney(event.price, event.currency)}</dd>
          </div>
          <div>
            <dt className="text-sm text-ink-soft">Seats left</dt>
            <dd className="font-display text-2xl font-bold tabular-nums">{left}</dd>
          </div>
        </dl>
      </header>

      {event.description && <p className="mt-6 max-w-2xl text-ink-soft">{event.description}</p>}

      <div className="mt-10 grid gap-6 lg:grid-cols-[1fr_320px]">
        <section aria-labelledby="seats-heading" className="min-w-0 rounded-[18px] border border-line bg-card p-4 sm:p-8">
          <h2 id="seats-heading" className="sr-only">
            Choose seats
          </h2>
          <SeatMap
            layout={event.layout}
            lockedSeats={availability.lockedSeats}
            bookedSeats={availability.bookedSeats}
            selected={selected}
            onToggle={toggle}
            disabled={holding}
          />
        </section>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="ticket ticket-vertical p-6 [--stub-y:calc(100%_-_200px)]">
            <div className="min-h-32 pb-8">
              <h2 className="font-display text-xl font-bold">Your seats</h2>
              {seats.length === 0 ? (
                <p className="mt-3 text-sm text-ink-soft">Tap seats on the map to add them. You can pick up to {MAX_SEATS}.</p>
              ) : (
                <ul className="mt-3 flex flex-wrap gap-1.5">
                  {seats.map((s) => (
                    <li key={s}>
                      <button
                        type="button"
                        onClick={() => toggle(s)}
                        className="rounded-full bg-marigold-soft px-2.5 py-1 text-sm font-semibold text-marigold-deep hover:bg-marigold/30"
                        aria-label={`Remove seat ${s}`}
                      >
                        {s} ✕
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <span className="ticket-perforation" aria-hidden />
            <div className="h-[176px] pt-6">
              <div className="flex items-baseline justify-between">
                <span className="text-ink-soft">
                  {seats.length} × {formatMoney(event.price, event.currency)}
                </span>
                <span className="font-display text-2xl font-bold">{formatMoney(total, event.currency)}</span>
              </div>
              <Button variant="accent" size="lg" className="mt-4 w-full" disabled={seats.length === 0} loading={holding} onClick={hold}>
                {user ? `Hold ${seats.length || ''} seat${seats.length === 1 ? '' : 's'}` : 'Sign in to book'}
              </Button>
              <p className="mt-3 text-center text-xs text-ink-soft">Seats are held for 5 minutes while you pay.</p>
            </div>
          </div>
        </aside>
      </div>
    </article>
  );
}
