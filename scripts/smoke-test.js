#!/usr/bin/env node
/**
 * End-to-end smoke test through the api-gateway. No dependencies (Node 20+).
 *
 *   node scripts/smoke-test.js [baseUrl=http://localhost:8080]
 *
 * Covers: auth + logout blacklist, catalog + cache headers, seat holds, conflicts,
 * idempotent retries, declined payment compensation, confirmation, cancellation,
 * notifications via Pub/Sub, and round-robin across booking-service replicas.
 */
const BASE = `${process.argv[2] || process.env.GATEWAY_URL || 'http://localhost:8080'}/api`;
const GOOD_CARD = { cardHolder: 'Smoke Test', cardNumber: '4242 4242 4242 4242', expiry: '12/30', cvc: '123' };
const DECLINE_CARD = { ...GOOD_CARD, cardNumber: '4000 0000 0000 0002' };

let passed = 0;
function check(label, condition, detail = '') {
  if (!condition) {
    console.error(`  ✗ ${label} ${detail}`);
    process.exit(1);
  }
  passed += 1;
  console.log(`  ✓ ${label}`);
}

async function api(method, path, { token, body, headers = {} } = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      ...(body && { 'Content-Type': 'application/json' }),
      ...(token && { Authorization: `Bearer ${token}` }),
      ...headers,
    },
    body: body && JSON.stringify(body),
  });
  const text = await res.text();
  return { status: res.status, headers: res.headers, body: text ? JSON.parse(text) : null };
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const key = () => `smoke-${crypto.randomUUID()}`;

async function main() {
  const run = Date.now();
  console.log(`Smoke testing ${BASE}\n`);

  console.log('auth-service');
  const alice = await api('POST', '/auth/register', { body: { name: 'Alice', email: `alice.${run}@test.dev`, password: 'password123' } });
  check('register returns 201 + token', alice.status === 201 && alice.body.token);
  await sleep(1000);
  const bob = await api('POST', '/auth/register', { body: { name: 'Bob', email: `bob.${run}@test.dev`, password: 'password123' } });
  check('second user registers', bob.status === 201, JSON.stringify(bob.body));
  const A = alice.body.token;
  const B = bob.body.token;
  check('GET /auth/me works', (await api('GET', '/auth/me', { token: A })).body.user.name === 'Alice');
  check('bookings without token → 401', (await api('GET', '/bookings')).status === 401);

  console.log('\nevent-service');
  const events = await api('GET', '/events?limit=50');
  check('catalog lists events', events.status === 200 && events.body.data.length > 0);
  const event = events.body.data.find((e) => e.layout.rows >= 2) || events.body.data[0];
  const detail = await api('GET', `/events/${event.id}?smoke=${run}`);
  check(`event detail (X-Cache: ${detail.headers.get('x-cache')}, gateway: ${detail.headers.get('x-gateway-cache')})`, detail.status === 200);

  console.log('\nbooking-service + seat-service (gRPC)');
  // Pick seats that are free right now so the test can be re-run against the same data.
  const before = await api('GET', `/availability/${event.id}`);
  const taken = new Set([...before.body.lockedSeats, ...before.body.bookedSeats]);
  const free = [];
  for (let r = 0; r < event.layout.rows; r += 1) {
    for (let n = 1; n <= event.layout.seatsPerRow; n += 1) {
      const seat = `${String.fromCharCode(65 + r)}${n}`;
      if (!taken.has(seat)) free.push(seat);
    }
  }
  check('found 4 free seats to play with', free.length >= 4);
  const [s1, s2, s3, s4] = free;
  const seats = [s1, s2];
  const holdKey = key();
  const hold = await api('POST', '/bookings', { token: A, body: { eventId: event.id, seats }, headers: { 'Idempotency-Key': holdKey } });
  check(`Alice holds ${seats} → PENDING`, hold.status === 201 && hold.body.booking.status === 'PENDING', JSON.stringify(hold.body));
  const replay = await api('POST', '/bookings', { token: A, body: { eventId: event.id, seats }, headers: { 'Idempotency-Key': holdKey } });
  check('retry with same Idempotency-Key replays the same booking', replay.body.booking.id === hold.body.booking.id && replay.headers.get('idempotent-replayed') === 'true');
  const clash = await api('POST', '/bookings', { token: B, body: { eventId: event.id, seats: [s2, s3] } });
  check(`Bob cannot take ${s2} → 409 with failedSeats`, clash.status === 409 && clash.body.error.details.failedSeats.includes(s2));
  const map1 = await api('GET', `/availability/${event.id}`);
  check(`seat map shows ${seats} locked`, seats.every((s) => map1.body.lockedSeats.includes(s)));

  const declined = await api('POST', `/bookings/${hold.body.booking.id}/pay`, { token: A, body: DECLINE_CARD, headers: { 'Idempotency-Key': key() } });
  check('declined card → 402, booking FAILED', declined.status === 402 && declined.body.error.details.booking.status === 'FAILED');
  const map2 = await api('GET', `/availability/${event.id}`);
  check('compensation released the seats', seats.every((s) => !map2.body.lockedSeats.includes(s)));

  const hold2 = await api('POST', '/bookings', { token: A, body: { eventId: event.id, seats }, headers: { 'Idempotency-Key': key() } });
  const payKey = key();
  const paid = await api('POST', `/bookings/${hold2.body.booking.id}/pay`, { token: A, body: GOOD_CARD, headers: { 'Idempotency-Key': payKey } });
  check('good card → CONFIRMED', paid.status === 200 && paid.body.booking.status === 'CONFIRMED', JSON.stringify(paid.body));
  const payAgain = await api('POST', `/bookings/${hold2.body.booking.id}/pay`, { token: A, body: GOOD_CARD, headers: { 'Idempotency-Key': payKey } });
  check('paying twice with same key does not double charge', payAgain.body.booking.payment.reference === paid.body.booking.payment.reference);
  const map3 = await api('GET', `/availability/${event.id}`);
  check(`seat map shows ${seats} booked`, seats.every((s) => map3.body.bookedSeats.includes(s)));
  check('sold seat cannot be held again → 409', (await api('POST', '/bookings', { token: B, body: { eventId: event.id, seats: [s1] } })).status === 409);

  const bobHold = await api('POST', '/bookings', { token: B, body: { eventId: event.id, seats: [s4] } });
  const cancelled = await api('POST', `/bookings/${bobHold.body.booking.id}/cancel`, { token: B });
  check('Bob cancels his hold → CANCELLED', cancelled.body.booking.status === 'CANCELLED');
  check('Bob cannot see Alice\'s booking → 404', (await api('GET', `/bookings/${hold2.body.booking.id}`, { token: B })).status === 404);

  const replicas = new Set();
  for (let i = 0; i < 8; i += 1) {
    replicas.add((await api('GET', '/bookings', { token: A })).headers.get('x-served-by'));
  }
  check(`gateway load-balances across ${replicas.size} booking replicas`, replicas.size >= 2, [...replicas].join(', '));

  console.log('\nnotification-service (Redis Pub/Sub)');
  await sleep(500);
  const notes = await api('GET', '/notifications', { token: A });
  const types = notes.body.data.map((n) => n.type);
  check('Alice got confirmed + failed notifications', types.includes('booking.confirmed') && types.includes('booking.failed'));
  check('mark all read', (await api('POST', '/notifications/read-all', { token: A })).body.updated >= 2);

  console.log('\nlogout');
  check('logout blacklists the token', (await api('POST', '/auth/logout', { token: A })).status === 200);
  check('revoked token rejected at the gateway → 401', (await api('GET', '/bookings', { token: A })).status === 401);

  console.log(`\nAll ${passed} checks passed.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
