import { formatDateTime, formatMoney } from '@/lib/format';
import Barcode from './Barcode';

// A confirmed booking rendered as an admission ticket.
export default function TicketCard({ booking }) {
  return (
    <div className="ticket ticket-vertical mx-auto max-w-md p-7 shadow-[0_24px_60px_-30px_rgba(22,33,62,0.45)] [--stub-y:calc(100%_-_132px)]">
      <div className="pb-8">
        <p className="text-sm font-semibold text-teal">Admit {booking.seats.length}</p>
        <h2 className="mt-2 font-display text-3xl leading-tight font-bold text-balance">{booking.event.title}</h2>
        <p className="mt-2 text-ink-soft">
          {formatDateTime(booking.event.startsAt)}
          <br />
          {booking.event.venue}, {booking.event.city}
        </p>
        <dl className="mt-6 grid grid-cols-2 gap-4">
          <div>
            <dt className="text-sm text-ink-soft">Seats</dt>
            <dd className="font-display text-xl font-bold">{booking.seats.join(', ')}</dd>
          </div>
          <div>
            <dt className="text-sm text-ink-soft">Paid</dt>
            <dd className="font-display text-xl font-bold">{formatMoney(booking.amount, booking.currency)}</dd>
          </div>
        </dl>
      </div>
      <span className="ticket-perforation" aria-hidden />
      <div className="h-[104px] pt-7">
        <Barcode value={booking.id} className="h-14 w-full text-ink" />
        <p className="mt-2 text-center text-xs tracking-[0.2em] text-ink-soft">{booking.id.toUpperCase()}</p>
      </div>
    </div>
  );
}
