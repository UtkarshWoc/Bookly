'use client';

import { useState } from 'react';
import Button from '@/components/ui/Button';
import Field, { fieldErrors } from '@/components/ui/Field';
import { formatMoney } from '@/lib/format';

const TEST_CARDS = [
  { number: '4242 4242 4242 4242', label: 'Succeeds' },
  { number: '4000 0000 0000 0002', label: 'Is declined' },
];

function formatCardNumber(value) {
  return value.replace(/\D/g, '').slice(0, 19).replace(/(.{4})/g, '$1 ').trim();
}

function formatExpiry(value) {
  const digits = value.replace(/\D/g, '').slice(0, 4);
  return digits.length > 2 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits;
}

export default function PaymentForm({ amount, currency, onPay, paying, error }) {
  const [form, setForm] = useState({ cardHolder: '', cardNumber: '', expiry: '', cvc: '' });
  const errors = fieldErrors(error);
  const set = (key, format = (v) => v) => (e) => setForm((f) => ({ ...f, [key]: format(e.target.value) }));

  const submit = (e) => {
    e.preventDefault();
    onPay(form);
  };

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-4">
      <Field label="Name on card" autoComplete="cc-name" value={form.cardHolder} onChange={set('cardHolder')} error={errors.cardHolder} required />
      <Field
        label="Card number"
        inputMode="numeric"
        autoComplete="cc-number"
        placeholder="1234 5678 9012 3456"
        value={form.cardNumber}
        onChange={set('cardNumber', formatCardNumber)}
        error={errors.cardNumber}
        required
      />
      <div className="grid grid-cols-2 gap-4">
        <Field label="Expiry" placeholder="MM/YY" inputMode="numeric" autoComplete="cc-exp" value={form.expiry} onChange={set('expiry', formatExpiry)} error={errors.expiry} required />
        <Field label="CVC" inputMode="numeric" autoComplete="cc-csc" maxLength={4} value={form.cvc} onChange={set('cvc', (v) => v.replace(/\D/g, ''))} error={errors.cvc} required />
      </div>

      <div className="rounded-xl border border-dashed border-line px-4 py-3 text-sm">
        <p className="font-semibold">This is a demo — use a test card</p>
        <ul className="mt-2 flex flex-col gap-1.5">
          {TEST_CARDS.map((card) => (
            <li key={card.number} className="flex items-center justify-between gap-3">
              <button
                type="button"
                className="font-semibold text-teal tabular-nums hover:underline"
                onClick={() => setForm((f) => ({ ...f, cardNumber: card.number, expiry: f.expiry || '12/30', cvc: f.cvc || '123', cardHolder: f.cardHolder || 'Demo Customer' }))}
              >
                {card.number}
              </button>
              <span className="text-ink-soft">{card.label}</span>
            </li>
          ))}
        </ul>
      </div>

      <Button type="submit" variant="accent" size="lg" loading={paying} className="w-full">
        Pay {formatMoney(amount, currency)}
      </Button>
    </form>
  );
}
