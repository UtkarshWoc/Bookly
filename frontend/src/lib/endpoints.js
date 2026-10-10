// Catalog of every public route exposed by the api-gateway, grouped by owning service.
// `access`: public | user (valid JWT, checked by nginx auth_request) | admin (JWT + admin role).

export const SERVICES = [
  {
    id: 'auth-service',
    name: 'auth-service',
    summary: 'Accounts and JWTs. Also answers nginx’s auth_request for every protected route.',
    endpoints: [
      {
        method: 'POST', path: '/auth/register', access: 'public',
        description: 'Create an account and receive a JWT. Rate limited at the gateway.',
        body: { name: 'Ada Lovelace', email: 'ada@example.com', password: 'password123' },
      },
      {
        method: 'POST', path: '/auth/login', access: 'public',
        description: 'Exchange email and password for a JWT. Limited to 5 requests per minute per IP.',
        body: { email: 'you@example.com', password: '<your password>' },
      },
      { method: 'GET', path: '/auth/me', access: 'user', description: 'The profile behind the current token.' },
      {
        method: 'GET', path: '/auth/verify', access: 'user',
        description: 'What nginx calls on every protected request. Returns X-User-Id and X-User-Role headers.',
      },
      {
        method: 'POST', path: '/auth/logout', access: 'user',
        description: 'Revoke the current token by adding its id to a Redis blacklist until it expires.',
      },
    ],
  },
  {
    id: 'event-service',
    name: 'event-service',
    summary: 'Event catalog. Reads pass through nginx proxy_cache, then Redis cache-aside, then MongoDB.',
    endpoints: [
      {
        method: 'GET', path: '/events', access: 'public', query: 'limit=5&category=Concert',
        description: 'Paginated upcoming events. Filters: q, category, city, upcoming, page, limit.',
      },
      { method: 'GET', path: '/events/categories', access: 'public', description: 'Categories you can filter by.' },
      {
        method: 'GET', path: '/events/:id', access: 'public',
        description: 'One event. Watch X-Gateway-Cache (nginx) and X-Cache (Redis) change on repeat calls.',
      },
      {
        method: 'POST', path: '/admin/events', access: 'admin',
        description: 'Create an event.',
        body: {
          title: 'Late Night Jazz Session', description: 'An intimate set in the round.', category: 'Concert',
          venue: 'Blue Frog', city: 'Mumbai', startsAt: '2027-01-15T15:00:00.000Z', price: 1500,
          layout: { rows: 6, seatsPerRow: 10 },
        },
      },
      {
        method: 'PATCH', path: '/admin/events/:id', access: 'admin',
        description: 'Update fields of an event. Invalidates its Redis cache entry.',
        body: { price: 1299 },
      },
      { method: 'DELETE', path: '/admin/events/:id', access: 'admin', description: 'Delete an event.' },
    ],
  },
  {
    id: 'booking-service',
    name: 'booking-service',
    summary: 'Orchestrates holds, payment and confirmation over gRPC. Runs as 2 load-balanced replicas.',
    endpoints: [
      {
        method: 'GET', path: '/availability/:eventId', access: 'public',
        description: 'Live seat map: seats being held and seats sold. A REST view of gRPC GetSeatMap.',
      },
      { method: 'GET', path: '/bookings', access: 'user', description: 'Your bookings, newest first.' },
      {
        method: 'POST', path: '/bookings', access: 'user', idempotent: true,
        description: 'Hold seats for 5 minutes (gRPC LockSeats). Send the same Idempotency-Key to retry safely.',
        body: { eventId: ':eventId', seats: ['A1', 'A2'] },
      },
      { method: 'GET', path: '/bookings/:id', access: 'user', description: 'One of your bookings.' },
      {
        method: 'POST', path: '/bookings/:id/pay', access: 'user', idempotent: true,
        description: 'Pay for a hold. Card 4000 0000 0000 0002 is declined and releases the seats.',
        body: { cardHolder: 'Ada Lovelace', cardNumber: '4242424242424242', expiry: '12/30', cvc: '123' },
      },
      {
        method: 'POST', path: '/bookings/:id/cancel', access: 'user', idempotent: true,
        description: 'Release a hold you no longer want (gRPC ReleaseSeats).',
      },
    ],
  },
  {
    id: 'notification-service',
    name: 'notification-service',
    summary: 'Listens for booking events on Redis Pub/Sub and stores notifications for you.',
    endpoints: [
      { method: 'GET', path: '/notifications', access: 'user', description: 'Your latest notifications and unread count.' },
      { method: 'POST', path: '/notifications/read-all', access: 'user', description: 'Mark everything as read.' },
      { method: 'PATCH', path: '/notifications/:id/read', access: 'user', description: 'Mark one notification as read.' },
    ],
  },
  {
    id: 'api-gateway',
    name: 'api-gateway',
    summary: 'nginx: routing, auth offloading, rate limits, caching and load balancing.',
    endpoints: [{ method: 'GET', path: '/health', access: 'public', description: 'Gateway liveness check.' }],
  },
];

// seat-service is internal and speaks gRPC only; it is documented, not callable from the browser.
export const SEAT_RPCS = [
  { name: 'LockSeats', description: 'SET seat:{event}:{seat} {user} NX EX 300 for every seat, all or nothing.' },
  { name: 'ConfirmSeats', description: 'Turns your held seats into sold seats. Safe to retry for the same booking.' },
  { name: 'ReleaseSeats', description: 'Deletes your holds only if you still own them (Lua compare-and-delete).' },
  { name: 'GetSeatMap', description: 'Seats being held (Redis SCAN) and seats sold (MongoDB).' },
];

export const endpointId = (e) => `${e.method} ${e.path}`;
