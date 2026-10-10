'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { bookingsApi } from '@/lib/api/bookings.api';
import { formatDateTime, formatMoney } from '@/lib/format';
import { seatsLeft } from '@/lib/seats';

// The soonest event, drawn as an oversized ticket with live seat count.
export default function FeaturedTicket({ event }) {
  const [availability, setAvailability] = useState(null);

  useEffect(() => {
    bookingsApi.availability(event.id).then(setAvailability).catch(() => {});
  }, [event.id]);

  const left = seatsLeft(event, availability);
  const capacity = event.layout.rows * event.layout.seatsPerRow;

  return (
    <Link
      href={`/events/${event.id}`}
      className="ticket ticket-vertical group block p-6 shadow-[0_24px_60px_-30px_rgba(22,33,62,0.45)] [--stub-y:calc(100%_-_128px)] sm:px-8 sm:pt-8"
    >
      <div className="flex min-h-56 flex-col pb-8">
        <p className="text-sm font-semibold text-marigold-deep">Coming up next</p>
        <h2 className="mt-3 font-display text-3xl leading-[1.05] font-bold tracking-tight text-balance group-hover:underline group-hover:decoration-marigold group-hover:underline-offset-[6px] sm:text-[40px]">
          {event.title}
        </h2>
        <p className="mt-auto pt-6 text-ink-soft">
          {event.venue}, {event.city}
          <br />
          {formatDateTime(event.startsAt)}
        </p>
      </div>

      <span className="ticket-perforation" aria-hidden />

      <div className="flex h-[104px] items-end justify-between gap-4 pt-8">
        <div>
          <p className="text-sm text-ink-soft">Seats left</p>
          <p className="font-display text-4xl font-bold tabular-nums">
            {left}
            <span className="text-lg font-medium text-ink-soft">/{capacity}</span>
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm text-ink-soft">From</p>
          <p className="font-display text-2xl font-bold">{formatMoney(event.price, event.currency)}</p>
        </div>
      </div>
    </Link>
  );
}
