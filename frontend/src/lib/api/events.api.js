import { request } from './client';

function toQuery(params) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') search.set(key, value);
  });
  const qs = search.toString();
  return qs ? `?${qs}` : '';
}

export const eventsApi = {
  list: (params = {}) => request(`/events${toQuery(params)}`, { auth: false }),
  get: (id) => request(`/events/${id}`, { auth: false }),
  categories: () => request('/events/categories', { auth: false }),

  // Admin endpoints (gateway checks the JWT, event-service checks the role).
  create: (body) => request('/admin/events', { method: 'POST', body }),
  update: (id, body) => request(`/admin/events/${id}`, { method: 'PATCH', body }),
  remove: (id) => request(`/admin/events/${id}`, { method: 'DELETE' }),
};
