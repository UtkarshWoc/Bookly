const Event = require('../models/event.model');
const logger = require('../utils/logger');

const DAY = 24 * 60 * 60 * 1000;

function daysFromNow(days, hour) {
  const date = new Date(Date.now() + days * DAY);
  date.setUTCHours(hour, 30, 0, 0);
  return date;
}

const SAMPLE_EVENTS = [
  {
    title: 'Midnight Frequencies: Live in Concert',
    description: 'A synth-wave night under the open sky with a full light show, two opening acts and a closing set that runs past midnight.',
    category: 'Concert', venue: 'Jawaharlal Nehru Stadium', city: 'Delhi',
    startsAt: daysFromNow(9, 14), price: 2499, layout: { rows: 10, seatsPerRow: 16 },
  },
  {
    title: 'Laugh Riot: Stand-up Special',
    description: 'Ninety minutes of brand-new material from three of the country’s sharpest stand-up comics. Strictly 16+.',
    category: 'Comedy', venue: 'Canvas Laugh Club', city: 'Mumbai',
    startsAt: daysFromNow(4, 15), price: 799, layout: { rows: 6, seatsPerRow: 12 },
  },
  {
    title: 'Hamlet — A Modern Retelling',
    description: 'Shakespeare’s tragedy reimagined in a glass-walled corporate tower. Live strings, minimal set, maximum drama.',
    category: 'Theatre', venue: 'Ranga Shankara', city: 'Bengaluru',
    startsAt: daysFromNow(12, 13), price: 1200, layout: { rows: 8, seatsPerRow: 14 },
  },
  {
    title: 'City Derby: Final Night',
    description: 'The season decider. Floodlights, drums and forty thousand voices — grab a seat in the home end.',
    category: 'Sports', venue: 'Salt Lake Stadium', city: 'Kolkata',
    startsAt: daysFromNow(6, 13), price: 650, layout: { rows: 12, seatsPerRow: 20 },
  },
  {
    title: 'Distributed Systems Summit 2026',
    description: 'Two tracks on consensus, queues, caches and the art of failing gracefully. Lunch and evening meetup included.',
    category: 'Conference', venue: 'HICC Novotel', city: 'Hyderabad',
    startsAt: daysFromNow(20, 4), price: 3999, layout: { rows: 10, seatsPerRow: 18 },
  },
  {
    title: 'Monsoon Folk Festival',
    description: 'Three stages of folk, fusion and street food. Bring a raincoat and dancing shoes.',
    category: 'Festival', venue: 'Mahalaxmi Lawns', city: 'Pune',
    startsAt: daysFromNow(15, 10), price: 1499, layout: { rows: 9, seatsPerRow: 16 },
  },
  {
    title: 'Jazz at the Lighthouse',
    description: 'An intimate seaside evening with a six-piece ensemble playing standards and new compositions.',
    category: 'Concert', venue: 'Phoenix Arena', city: 'Chennai',
    startsAt: daysFromNow(7, 14), price: 1800, layout: { rows: 5, seatsPerRow: 10 },
  },
  {
    title: 'Improv Night: You Write the Show',
    description: 'The audience calls the scenes, the cast makes it up on the spot. No two nights are the same.',
    category: 'Comedy', venue: 'The Habitat', city: 'Mumbai',
    startsAt: daysFromNow(3, 15), price: 599, layout: { rows: 5, seatsPerRow: 12 },
  },
];

async function seedEvents() {
  if ((await Event.estimatedDocumentCount()) > 0) return;
  await Event.insertMany(SAMPLE_EVENTS.map((e) => ({ ...e, createdBy: 'seed' })));
  logger.info(`Seeded ${SAMPLE_EVENTS.length} sample events`);
}

module.exports = seedEvents;
