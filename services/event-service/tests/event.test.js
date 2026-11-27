const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert/strict');

process.env.MONGO_URI = 'mongodb://localhost:27017';
process.env.EVENT_REDIS_URL = 'redis://localhost:6379/1';
process.env.EVENT_CACHE_TTL_SECONDS = '60';

const cacheStore = new Map();
const fakeRedis = {
  async get(key) {
    return cacheStore.get(key) ?? null;
  },
  async set(key, val) {
    cacheStore.set(key, val);
    return 'OK';
  },
  async del(key) {
    cacheStore.delete(key);
    return 1;
  },
};
require.cache[require.resolve('../src/config/redis')] = {
  id: require.resolve('../src/config/redis'),
  filename: require.resolve('../src/config/redis'),
  loaded: true,
  exports: fakeRedis,
};

const eventService = require('../src/services/event.service');
const Event = require('../src/models/event.model');
const { createEventSchema, updateEventSchema, listEventsQuery } = require('../src/validators/event.validators');

const VALID_ID = '507f1f77bcf86cd799439011';

describe('event.validators', () => {
  it('requires future startsAt when creating an event', () => {
    const past = createEventSchema.safeParse({
      title: 'Past Show',
      category: 'Concert',
      venue: 'Arena',
      city: 'Delhi',
      startsAt: new Date(Date.now() - 60_000).toISOString(),
      price: 500,
      layout: { rows: 5, seatsPerRow: 10 },
    });
    assert.equal(past.success, false);
  });

  it('allows partial metadata updates even when startsAt is omitted or existing', () => {
    const res = updateEventSchema.safeParse({ price: 999 });
    assert.equal(res.success, true);
    assert.equal(res.data.price, 999);

    const empty = updateEventSchema.safeParse({});
    assert.equal(empty.success, false);
  });

  it('defaults query pagination and upcoming filter', () => {
    const q = listEventsQuery.parse({});
    assert.equal(q.upcoming, 'true');
    assert.equal(q.page, 1);
    assert.equal(q.limit, 12);
  });
});

describe('event.service', () => {
  beforeEach(() => cacheStore.clear());

  it('implements cache-aside MISS then HIT on getById and invalidates on update/remove', async (t) => {
    const sample = {
      id: VALID_ID,
      title: 'Synth Night',
      category: 'Concert',
      venue: 'Arena',
      city: 'Mumbai',
      price: 1200,
      layout: { rows: 5, seatsPerRow: 10 },
      toJSON() {
        return {
          id: this.id,
          title: this.title,
          category: this.category,
          venue: this.venue,
          city: this.city,
          price: this.price,
          layout: this.layout,
        };
      },
    };

    let dbCalls = 0;
    t.mock.method(Event, 'findById', async () => {
      dbCalls += 1;
      return sample;
    });

    const first = await eventService.getById(VALID_ID);
    assert.equal(first.cache, 'MISS');
    assert.equal(first.event.title, 'Synth Night');
    assert.equal(dbCalls, 1);

    const second = await eventService.getById(VALID_ID);
    assert.equal(second.cache, 'HIT');
    assert.equal(dbCalls, 1);

    t.mock.method(Event, 'findByIdAndUpdate', async () => ({
      ...sample,
      price: 1500,
      toJSON() {
        return { ...sample.toJSON(), price: 1500 };
      },
    }));
    const updated = await eventService.update(VALID_ID, { price: 1500 });
    assert.equal(updated.price, 1500);
    assert.equal(cacheStore.has(`event:${VALID_ID}`), false);

    cacheStore.set(`event:${VALID_ID}`, JSON.stringify(sample.toJSON()));
    t.mock.method(Event, 'findByIdAndDelete', async () => sample);
    await eventService.remove(VALID_ID);
    assert.equal(cacheStore.has(`event:${VALID_ID}`), false);
  });

  it('throws 404 for malformed ObjectId', async () => {
    await assert.rejects(() => eventService.getById('not-an-id'), { status: 404 });
  });
});
