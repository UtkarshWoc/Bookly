// Seat ids follow the backend convention: row letter + seat number, e.g. "C12".

export const rowLabel = (index) => String.fromCharCode(65 + index);

export function buildSeatGrid({ rows, seatsPerRow }) {
  return Array.from({ length: rows }, (_, r) => ({
    row: rowLabel(r),
    seats: Array.from({ length: seatsPerRow }, (_, s) => `${rowLabel(r)}${s + 1}`),
  }));
}

export function sortSeats(seats) {
  return [...seats].sort((a, b) => a[0].localeCompare(b[0]) || Number(a.slice(1)) - Number(b.slice(1)));
}

export function seatsLeft(event, availability) {
  const capacity = event.layout.rows * event.layout.seatsPerRow;
  if (!availability) return capacity;
  return capacity - availability.bookedSeats.length - availability.lockedSeats.length;
}
