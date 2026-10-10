const { z } = require('zod');
const config = require('../config');

function passesLuhn(digits) {
  let sum = 0;
  for (let i = 0; i < digits.length; i += 1) {
    let d = Number(digits[digits.length - 1 - i]);
    if (i % 2 === 1) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
  }
  return sum % 10 === 0;
}

const createBookingSchema = z.object({
  // Lower-cased so one event can never map to two different seat-lock keys.
  eventId: z.string().regex(/^[a-f0-9]{24}$/i, 'eventId must be a valid id').transform((id) => id.toLowerCase()),
  seats: z
    .array(z.string().trim().toUpperCase().regex(/^[A-Z][1-9][0-9]?$/, 'Seat must look like A1'))
    .min(1, 'Select at least one seat')
    .max(config.maxSeatsPerBooking, `At most ${config.maxSeatsPerBooking} seats per booking`)
    .transform((seats) => [...new Set(seats)].sort()),
});

const payBookingSchema = z.object({
  cardHolder: z.string().trim().min(2, 'Card holder name is required').max(60),
  cardNumber: z
    .string()
    .transform((v) => v.replace(/[\s-]/g, ''))
    .refine((v) => /^\d{12,19}$/.test(v), 'Card number must be 12-19 digits')
    .refine(passesLuhn, 'Card number is invalid'),
  expiry: z
    .string()
    .trim()
    .regex(/^(0[1-9]|1[0-2])\/\d{2}$/, 'Expiry must be MM/YY')
    .refine((v) => {
      const [mm, yy] = v.split('/').map(Number);
      return new Date(2000 + yy, mm) > new Date();
    }, 'Card has expired'),
  cvc: z.string().trim().regex(/^\d{3,4}$/, 'CVC must be 3 or 4 digits'),
});

module.exports = { createBookingSchema, payBookingSchema };
