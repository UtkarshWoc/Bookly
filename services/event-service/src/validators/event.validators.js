const { z } = require('zod');
const { CATEGORIES } = require('../models/event.model');

const layoutSchema = z.object({
  rows: z.coerce.number().int().min(1).max(26),
  seatsPerRow: z.coerce.number().int().min(1).max(40),
});

const createEventSchema = z.object({
  title: z.string().trim().min(3).max(120),
  description: z.string().trim().max(2000).default(''),
  category: z.enum(CATEGORIES),
  venue: z.string().trim().min(2).max(120),
  city: z.string().trim().min(2).max(60),
  startsAt: z.coerce.date().refine((d) => d.getTime() > Date.now(), 'Event must start in the future'),
  price: z.coerce.number().min(0).max(1_000_000),
  currency: z.string().trim().length(3).toUpperCase().default('INR'),
  imageUrl: z.string().trim().url().or(z.literal('')).default(''),
  layout: layoutSchema,
});

const updateEventSchema = createEventSchema
  .partial()
  .refine((body) => Object.keys(body).length > 0, 'Provide at least one field to update');

const listEventsQuery = z.object({
  q: z.string().trim().max(100).optional(),
  category: z.enum(CATEGORIES).optional(),
  city: z.string().trim().max(60).optional(),
  upcoming: z.enum(['true', 'false']).default('true'),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(12),
});

module.exports = { createEventSchema, updateEventSchema, listEventsQuery };
