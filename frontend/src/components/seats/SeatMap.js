'use client';

import { useEffect, useRef, useState } from 'react';
import { buildSeatGrid } from '@/lib/seats';

const SEAT_BASE =
  'relative grid size-7 shrink-0 place-items-center rounded-t-[9px] rounded-b-[4px] border text-[10px] font-semibold transition-colors sm:size-8';

function seatState(seat, { selected, locked, booked }) {
  if (selected.has(seat)) return 'selected';
  if (booked.has(seat)) return 'booked';
  if (locked.has(seat)) return 'held';
  return 'open';
}

const STATE_CLASSES = {
  open: 'border-teal/50 bg-card text-teal hover:bg-teal-soft',
  selected: 'border-marigold bg-marigold text-ink',
  held: 'seat-held cursor-not-allowed text-transparent',
  booked: 'cursor-not-allowed border-sold bg-sold text-transparent',
};

const STATE_LABELS = { open: 'available', selected: 'selected', held: 'held by someone else', booked: 'sold' };

/**
 * Theatre-style seat chart. Rows are lettered from the stage back; an aisle
 * splits each row in half. Seats you hold for this booking show as "selected".
 */
export default function SeatMap({ layout, lockedSeats = [], bookedSeats = [], selected, onToggle, disabled = false }) {
  const grid = buildSeatGrid(layout);
  const locked = new Set(lockedSeats);
  const booked = new Set(bookedSeats);
  const aisleAfter = Math.ceil(layout.seatsPerRow / 2);
  const scrollerRef = useRef(null);
  const [overflowing, setOverflowing] = useState(false);

  // On narrow screens, start centred on the stage like a real seat chart.
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const wide = el.scrollWidth > el.clientWidth;
    setOverflowing(wide);
    if (wide) el.scrollLeft = (el.scrollWidth - el.clientWidth) / 2;
  }, [layout.rows, layout.seatsPerRow]);

  return (
    <div>
      {overflowing && <p className="mb-3 text-center text-sm text-ink-soft">Swipe sideways to see the whole row.</p>}
      <div ref={scrollerRef} className="overflow-x-auto pb-2">
        <div className="mx-auto w-max px-2">
          <svg viewBox="0 0 400 46" className="mx-auto mb-6 w-full max-w-md" aria-hidden>
            <path d="M10 40 Q200 -8 390 40" fill="none" stroke="currentColor" strokeWidth="3" className="text-ink" />
            <text x="200" y="40" textAnchor="middle" className="fill-ink-soft text-[13px]">
              Stage
            </text>
          </svg>

          <div role="grid" aria-label="Seat map" className="flex flex-col gap-1.5">
            {grid.map(({ row, seats }) => (
              <div role="row" key={row} className="flex items-center gap-1.5">
                <span className="w-5 text-center text-xs font-semibold text-ink-soft" aria-hidden>
                  {row}
                </span>
                {seats.map((seat, i) => {
                  const state = seatState(seat, { selected, locked, booked });
                  const unavailable = state === 'held' || state === 'booked';
                  return (
                    <span role="gridcell" key={seat} className={`flex ${i + 1 === aisleAfter ? 'mr-5' : ''}`}>
                      <button
                        type="button"
                        className={`${SEAT_BASE} ${STATE_CLASSES[state]}`}
                        aria-label={`Row ${row}, seat ${seat.slice(1)}, ${STATE_LABELS[state]}`}
                        aria-pressed={state === 'selected'}
                        disabled={disabled || unavailable}
                        onClick={() => onToggle(seat)}
                      >
                        {seat.slice(1)}
                      </button>
                    </span>
                  );
                })}
                <span className="w-5 text-center text-xs font-semibold text-ink-soft" aria-hidden>
                  {row}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <ul className="mt-6 flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-ink-soft">
        {[
          ['open', 'Available'],
          ['selected', 'Your pick'],
          ['held', 'Being booked'],
          ['booked', 'Sold'],
        ].map(([state, label]) => (
          <li key={state} className="flex items-center gap-2">
            <span className={`${SEAT_BASE} !size-4 ${STATE_CLASSES[state]}`} aria-hidden />
            {label}
          </li>
        ))}
      </ul>
    </div>
  );
}
