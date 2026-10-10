'use client';

import { useState } from 'react';
import Button from '@/components/ui/Button';
import Field, { fieldErrors } from '@/components/ui/Field';

function toLocalInput(value) {
  if (!value) return '';
  const date = new Date(value);
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

const EMPTY = {
  title: '', description: '', category: 'Concert', venue: '', city: '',
  startsAt: '', price: '', currency: 'INR', rows: 8, seatsPerRow: 12,
};

function fromEvent(event) {
  if (!event) return EMPTY;
  return {
    title: event.title,
    description: event.description,
    category: event.category,
    venue: event.venue,
    city: event.city,
    startsAt: toLocalInput(event.startsAt),
    price: event.price,
    currency: event.currency,
    rows: event.layout.rows,
    seatsPerRow: event.layout.seatsPerRow,
  };
}

export default function EventForm({ event, categories, onSubmit, onCancel, saving, error }) {
  const [form, setForm] = useState(() => fromEvent(event));
  const errors = fieldErrors(error);
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = (e) => {
    e.preventDefault();
    onSubmit({
      title: form.title,
      description: form.description,
      category: form.category,
      venue: form.venue,
      city: form.city,
      startsAt: form.startsAt ? new Date(form.startsAt).toISOString() : '',
      price: Number(form.price),
      currency: form.currency,
      layout: { rows: Number(form.rows), seatsPerRow: Number(form.seatsPerRow) },
    });
  };

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-4">
      {error && !Object.keys(errors).length && (
        <p role="alert" className="rounded-xl bg-rose-soft px-4 py-3 text-sm font-medium text-rose">
          {error.message}
        </p>
      )}
      <Field label="Title" value={form.title} onChange={set('title')} error={errors.title} required />
      <Field label="Description" as="textarea" rows={3} value={form.description} onChange={set('description')} error={errors.description} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Category" as="select" value={form.category} onChange={set('category')} error={errors.category}>
          {categories.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </Field>
        <Field label="Starts at" type="datetime-local" value={form.startsAt} onChange={set('startsAt')} error={errors.startsAt} required />
        <Field label="Venue" value={form.venue} onChange={set('venue')} error={errors.venue} required />
        <Field label="City" value={form.city} onChange={set('city')} error={errors.city} required />
        <Field label="Price per seat" type="number" min="0" value={form.price} onChange={set('price')} error={errors.price} required />
        <Field label="Currency" value={form.currency} maxLength={3} onChange={set('currency')} error={errors.currency} />
        <Field label="Rows" type="number" min="1" max="26" value={form.rows} onChange={set('rows')} error={errors['layout.rows']} hint="1–26, lettered A–Z" />
        <Field label="Seats per row" type="number" min="1" max="40" value={form.seatsPerRow} onChange={set('seatsPerRow')} error={errors['layout.seatsPerRow']} hint="1–40" />
      </div>
      <div className="mt-2 flex gap-3">
        <Button type="submit" loading={saving}>
          {event ? 'Save changes' : 'Create event'}
        </Button>
        <Button variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
