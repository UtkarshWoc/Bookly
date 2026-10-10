import Link from 'next/link';
import { dateParts, formatMoney, formatTime } from '@/lib/format';

// One event as a horizontal ticket: date block, details, and a price stub.
export default function EventStrip({ event }) {
  const { day, month, weekday } = dateParts(event.startsAt);

  return (
    <li>
      <Link
        href={`/events/${event.id}`}
        className="ticket group grid grid-cols-[72px_1fr] items-stretch gap-0 [--stub-x:calc(100%_-_148px)] hover:shadow-[0_6px_24px_-12px_rgba(22,33,62,0.35)] sm:grid-cols-[88px_1fr_148px] max-sm:[--notch:0px]"
      >
        <div className="flex flex-col items-center justify-center rounded-l-[18px] bg-ink py-4 text-white">
          <span className="text-xs text-white/70">{weekday}</span>
          <span className="font-display text-3xl leading-none font-bold text-marigold">{day}</span>
          <span className="text-sm">{month}</span>
        </div>

        <div className="min-w-0 px-4 py-4 sm:px-6">
          <p className="text-sm text-ink-soft">{event.category}</p>
          <h3 className="mt-0.5 font-display text-lg leading-snug font-semibold group-hover:underline group-hover:underline-offset-4 sm:text-xl">
            {event.title}
          </h3>
          <p className="mt-1 text-sm text-ink-soft">
            {event.venue}, {event.city} at {formatTime(event.startsAt)}
          </p>
          <p className="mt-2 text-sm font-semibold sm:hidden">From {formatMoney(event.price, event.currency)}</p>
        </div>

        <span className="ticket-perforation hidden sm:block" aria-hidden />
        <div className="hidden flex-col items-center justify-center px-4 text-center sm:flex">
          <span className="font-display text-xl font-bold">{formatMoney(event.price, event.currency)}</span>
          <span className="mt-1 text-sm font-semibold text-teal">Choose seats</span>
        </div>
      </Link>
    </li>
  );
}
