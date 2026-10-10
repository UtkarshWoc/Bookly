const crypto = require('crypto');
const config = require('../config');

// Mock payment provider. One configurable card number is always declined so the
// failure + compensation path can be exercised; everything else is approved.
async function charge({ amount, currency, cardNumber }) {
  await new Promise((resolve) => setTimeout(resolve, config.payment.latencyMs));

  const cardLast4 = cardNumber.slice(-4);
  const reference = `pay_${crypto.randomBytes(8).toString('hex')}`;

  if (cardNumber === config.payment.declineCard) {
    return { approved: false, reference, cardLast4, reason: 'Card declined by issuer' };
  }
  return { approved: true, reference, cardLast4, amount, currency };
}

module.exports = { charge };
