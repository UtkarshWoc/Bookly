'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { bookingsApi } from '@/lib/api/bookings.api';
import { newIdempotencyKey } from '@/lib/api/client';
import { formatDateTime, formatMoney } from '@/lib/format';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { useToast } from '@/context/ToastContext';
import HoldTimer from '@/components/booking/HoldTimer';
import PaymentForm from '@/components/booking/PaymentForm';
import TicketCard from '@/components/booking/TicketCard';
import Button, { ButtonLink } from '@/components/ui/Button';
import StatusPill from '@/components/ui/StatusPill';
import { ErrorNotice, Spinner } from '@/components/ui/States';

const OUTCOME_COPY = {
  FAILED: { title: 'Payment didn’t go through', body: 'Your seats were released so others can book them. You can pick seats again and retry.' },
  EXPIRED: { title: 'Your hold ran out', body: 'Seats are held for 5 minutes. They’re back on sale now — pick them again if they’re still free.' },
  CANCELLED: { title: 'You released these seats', body: 'Nothing was charged. The seats are back on sale.' },
};

function announceChange() {
  window.dispatchEvent(new CustomEvent('bookly:bookings-changed'));
}

export default function BookingPage() {
  const { id } = useParams();
  const { allowed } = useRequireAuth();
  const { notify } = useToast();

  const [booking, setBooking] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [payError, setPayError] = useState(null);
  const [busy, setBusy] = useState(null);
  // A fresh key per payment attempt; reused if the same attempt is retried.
  const [payKey, setPayKey] = useState(() => newIdempotencyKey('pay'));

  const load = useCallback(() => {
    bookingsApi.get(id).then(({ booking: b }) => setBooking(b)).catch(setLoadError);
  }, [id]);

  useEffect(() => {
    if (allowed) load();
  }, [allowed, load]);

  const pay = async (card) => {
    setBusy('pay');
    setPayError(null);
    try {
      const { booking: b } = await bookingsApi.pay(id, card, payKey);
      setBooking(b);
      notify('Payment received. Enjoy the show!', 'success');
    } catch (err) {
      if (err.status === 400) {
        setPayError(err);
      } else {
        if (err.details?.booking) setBooking(err.details.booking);
        else load();
        notify(err.message, 'error');
      }
      setPayKey(newIdempotencyKey('pay'));
    } finally {
      setBusy(null);
      announceChange();
    }
  };

  const release = async () => {
    setBusy('release');
    try {
      const { booking: b } = await bookingsApi.cancel(id, newIdempotencyKey('cancel'));
      setBooking(b);
      announceChange();
    } catch (err) {
      notify(err.message, 'error');
      load();
    } finally {
      setBusy(null);
    }
  };

  if (!allowed) return <Spinner />;
  if (loadError) return <ErrorNotice error={loadError} />;
  if (!booking) return <Spinner label="Loading your booking" />;

  if (booking.status === 'CONFIRMED') {
    return (
      <div className="py-6">
        <div className="mb-10 text-center">
          <h1 className="font-display text-4xl font-extrabold tracking-tight sm:text-5xl">You’re in.</h1>
          <p className="mt-3 text-ink-soft">Show this ticket at the door. We’ve also added it to My tickets.</p>
        </div>
        <TicketCard booking={booking} />
        <div className="mt-10 flex justify-center gap-3">
          <ButtonLink href="/bookings" variant="outline">
            My tickets
          </ButtonLink>
          <ButtonLink href="/" variant="ghost">
            Find another event
          </ButtonLink>
        </div>
      </div>
    );
  }

  const summary = (
    <div className="rounded-[18px] border border-line bg-card p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-bold">{booking.event.title}</h2>
          <p className="mt-1 text-ink-soft">
            {formatDateTime(booking.event.startsAt)}, {booking.event.venue}
          </p>
        </div>
        <StatusPill status={booking.status} />
      </div>
      <dl className="mt-6 flex flex-col gap-2 border-t border-line pt-4">
        <div className="flex justify-between">
          <dt className="text-ink-soft">Seats</dt>
          <dd className="font-semibold">{booking.seats.join(', ')}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-ink-soft">
            {booking.seats.length} × {formatMoney(booking.unitPrice, booking.currency)}
          </dt>
          <dd className="font-display text-xl font-bold">{formatMoney(booking.amount, booking.currency)}</dd>
        </div>
      </dl>
    </div>
  );

  if (booking.status !== 'PENDING') {
    const copy = OUTCOME_COPY[booking.status];
    return (
      <div className="mx-auto max-w-xl py-6">
        <h1 className="font-display text-4xl font-extrabold tracking-tight">{copy.title}</h1>
        <p className="mt-3 text-ink-soft">{booking.failureReason && booking.status === 'FAILED' ? `${booking.failureReason}. ` : ''}{copy.body}</p>
        <div className="mt-8">{summary}</div>
        <div className="mt-8 flex gap-3">
          <ButtonLink href={`/events/${booking.eventId}`}>Choose seats again</ButtonLink>
          <ButtonLink href="/bookings" variant="ghost">
            My tickets
          </ButtonLink>
        </div>
      </div>
    );
  }

  return (
    <div className="py-2">
      <Link href={`/events/${booking.eventId}`} className="text-sm font-semibold text-ink-soft hover:text-ink">
        ← Back to the seat map
      </Link>
      <h1 className="mt-6 font-display text-4xl font-extrabold tracking-tight sm:text-5xl">Checkout</h1>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_420px]">
        <div className="flex flex-col gap-6">
          <HoldTimer expiresAt={booking.holdExpiresAt} onExpire={load} />
          {summary}
          <Button variant="danger" className="self-start" loading={busy === 'release'} disabled={busy === 'pay'} onClick={release}>
            Release these seats
          </Button>
        </div>
        <section aria-labelledby="pay-heading" className="rounded-[18px] border border-line bg-card p-6">
          <h2 id="pay-heading" className="mb-5 font-display text-xl font-bold">
            Payment details
          </h2>
          <PaymentForm amount={booking.amount} currency={booking.currency} onPay={pay} paying={busy === 'pay'} error={payError} />
        </section>
      </div>
    </div>
  );
}
