import { request } from './client';

export const bookingsApi = {
  availability: (eventId) => request(`/availability/${eventId}`, { auth: false }),
  list: () => request('/bookings'),
  get: (id) => request(`/bookings/${id}`),
  hold: (body, idempotencyKey) => request('/bookings', { method: 'POST', body, idempotencyKey }),
  pay: (id, body, idempotencyKey) => request(`/bookings/${id}/pay`, { method: 'POST', body, idempotencyKey }),
  cancel: (id, idempotencyKey) => request(`/bookings/${id}/cancel`, { method: 'POST', idempotencyKey }),
};
