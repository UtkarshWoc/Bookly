import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { buildSeatGrid, sortSeats, seatsLeft } from '../src/lib/seats.js';
import { formatMoney, timeAgo } from '../src/lib/format.js';
import { SERVICES, SEAT_RPCS, endpointId } from '../src/lib/endpoints.js';
import { readCookie } from '../src/lib/api/client.js';

describe('frontend seats helpers', () => {
  it('builds lettered rows and numbered seats', () => {
    const grid = buildSeatGrid({ rows: 2, seatsPerRow: 3 });
    assert.deepEqual(grid, [
      { row: 'A', seats: ['A1', 'A2', 'A3'] },
      { row: 'B', seats: ['B1', 'B2', 'B3'] },
    ]);
  });

  it('sorts seats naturally by row then numeric seat index', () => {
    assert.deepEqual(sortSeats(['B10', 'A2', 'B2', 'A10', 'A1']), ['A1', 'A2', 'A10', 'B2', 'B10']);
  });

  it('computes seatsLeft from capacity and availability', () => {
    const event = { layout: { rows: 4, seatsPerRow: 5 } };
    assert.equal(seatsLeft(event, null), 20);
    assert.equal(seatsLeft(event, { bookedSeats: ['A1', 'A2'], lockedSeats: ['B1'] }), 17);
  });
});

describe('frontend format helpers', () => {
  it('formats currency safely and falls back on unknown currency codes', () => {
    assert.match(formatMoney(1500, 'INR'), /1,500/);
    assert.equal(formatMoney(100, 'INVALID_CODE'), '100 INVALID_CODE');
  });

  it('formats recent timestamps with timeAgo', () => {
    assert.equal(timeAgo(new Date(Date.now() - 10_000).toISOString()), 'just now');
    assert.equal(timeAgo(new Date(Date.now() - 5 * 60_000).toISOString()), '5 min ago');
  });
});

describe('endpoints catalog', () => {
  it('defines unique method+path ids and documents all 4 gRPC RPCs', () => {
    const ids = SERVICES.flatMap((s) => s.endpoints).map(endpointId);
    assert.equal(new Set(ids).size, ids.length);
    assert.deepEqual(SEAT_RPCS.map((r) => r.name), ['LockSeats', 'ConfirmSeats', 'ReleaseSeats', 'GetSeatMap']);
  });
});

describe('client cookie & auth hardening', () => {
  it('extracts CSRF cookie from document.cookie safely', () => {
    globalThis.document = { cookie: 'other=1; bookly_csrf=abc123def; theme=paper' };
    try {
      assert.equal(readCookie('bookly_csrf'), 'abc123def');
      assert.equal(readCookie('missing'), null);
    } finally {
      delete globalThis.document;
    }
  });

  it('does not persist JWTs in localStorage and includes credentials on auth endpoints', () => {
    const clientSource = fs.readFileSync(path.resolve(import.meta.dirname, '../src/lib/api/client.js'), 'utf8');
    const authApiSource = fs.readFileSync(path.resolve(import.meta.dirname, '../src/lib/api/auth.api.js'), 'utf8');
    assert.equal(clientSource.includes('localStorage'), false);
    assert.equal(clientSource.includes("credentials: auth ? 'include' : 'omit'"), true);
    assert.equal(authApiSource.includes('auth: false'), false);
  });
});
