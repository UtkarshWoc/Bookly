const { isValidObjectId } = require('mongoose');
const config = require('../config');
const Event = require('../models/event.model');
const ApiError = require('../utils/ApiError');
const cache = require('./cache.service');

const cacheKey = (id) => `event:${id}`;

function escapeRegex(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function list({ q, category, city, upcoming, page, limit }) {
  const filter = {};
  if (category) filter.category = category;
  if (city) filter.city = new RegExp(`^${escapeRegex(city)}$`, 'i');
  if (upcoming === 'true') filter.startsAt = { $gte: new Date() };
  if (q) {
    const pattern = new RegExp(escapeRegex(q), 'i');
    filter.$or = [{ title: pattern }, { venue: pattern }, { city: pattern }, { description: pattern }];
  }

  const [events, total] = await Promise.all([
    Event.find(filter).sort({ startsAt: 1 }).skip((page - 1) * limit).limit(limit),
    Event.countDocuments(filter),
  ]);

  return {
    data: events.map((e) => e.toJSON()),
    pagination: { page, limit, total, pages: Math.ceil(total / limit) || 1 },
  };
}

// Cache-aside: Redis first, MongoDB on a miss, then populate Redis with a TTL.
async function getById(id) {
  if (!isValidObjectId(id)) throw ApiError.notFound('Event not found');

  const cached = await cache.getJSON(cacheKey(id));
  if (cached) return { event: cached, cache: 'HIT' };

  const event = await Event.findById(id);
  if (!event) throw ApiError.notFound('Event not found');

  const json = event.toJSON();
  await cache.setJSON(cacheKey(id), json, config.cacheTtlSeconds);
  return { event: json, cache: 'MISS' };
}

async function create(data, userId) {
  const event = await Event.create({ ...data, createdBy: userId });
  return event.toJSON();
}

// Writes invalidate the Redis entry; the gateway's short proxy_cache TTL bounds staleness there.
async function update(id, data) {
  if (!isValidObjectId(id)) throw ApiError.notFound('Event not found');
  const event = await Event.findByIdAndUpdate(id, data, { new: true, runValidators: true });
  if (!event) throw ApiError.notFound('Event not found');
  await cache.del(cacheKey(id));
  return event.toJSON();
}

async function remove(id) {
  if (!isValidObjectId(id)) throw ApiError.notFound('Event not found');
  const event = await Event.findByIdAndDelete(id);
  if (!event) throw ApiError.notFound('Event not found');
  await cache.del(cacheKey(id));
}

module.exports = { list, getById, create, update, remove, categories: Event.CATEGORIES };
