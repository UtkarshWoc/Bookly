'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { eventsApi } from '@/lib/api/events.api';
import { formatDateTime, formatMoney } from '@/lib/format';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { useToast } from '@/context/ToastContext';
import EventForm from '@/components/admin/EventForm';
import Button from '@/components/ui/Button';
import { ErrorNotice, Spinner } from '@/components/ui/States';

export default function AdminPage() {
  const { allowed } = useRequireAuth({ admin: true });
  const { notify } = useToast();

  const [events, setEvents] = useState(null);
  const [categories, setCategories] = useState([]);
  const [loadError, setLoadError] = useState(null);
  const [editing, setEditing] = useState(null); // null | 'new' | event
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);

  // A cache-busting param skips the gateway's 15s proxy_cache so edits show immediately.
  const load = useCallback(() => {
    eventsApi
      .list({ upcoming: 'false', limit: 50, fresh: Date.now() })
      .then((r) => setEvents(r.data))
      .catch(setLoadError);
  }, []);

  useEffect(() => {
    if (!allowed) return;
    load();
    eventsApi.categories().then((r) => setCategories(r.categories)).catch(() => {});
  }, [allowed, load]);

  const save = async (body) => {
    setSaving(true);
    setSaveError(null);
    try {
      if (editing === 'new') await eventsApi.create(body);
      else await eventsApi.update(editing.id, body);
      notify(editing === 'new' ? 'Event created' : 'Changes saved', 'success');
      setEditing(null);
      load();
    } catch (err) {
      setSaveError(err);
    } finally {
      setSaving(false);
    }
  };

  const remove = async (event) => {
    if (!window.confirm(`Delete "${event.title}"? Existing bookings keep their copy of the event details.`)) return;
    try {
      await eventsApi.remove(event.id);
      notify('Event deleted', 'success');
      load();
    } catch (err) {
      notify(err.message, 'error');
    }
  };

  if (!allowed) return <Spinner />;

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl font-extrabold tracking-tight sm:text-5xl">Manage events</h1>
          <p className="mt-2 text-ink-soft">The public catalog may take up to 15 seconds to show changes, because the gateway caches it.</p>
        </div>
        {!editing && (
          <Button variant="accent" onClick={() => { setSaveError(null); setEditing('new'); }}>
            New event
          </Button>
        )}
      </div>

      {editing && (
        <section className="mt-8 rounded-[18px] border border-line bg-card p-6">
          <h2 className="mb-5 font-display text-2xl font-bold">{editing === 'new' ? 'New event' : `Edit ${editing.title}`}</h2>
          <EventForm
            key={editing === 'new' ? 'new' : editing.id}
            event={editing === 'new' ? null : editing}
            categories={categories}
            onSubmit={save}
            onCancel={() => setEditing(null)}
            saving={saving}
            error={saveError}
          />
        </section>
      )}

      <div className="mt-8">
        {loadError && <ErrorNotice error={loadError} onRetry={load} />}
        {!events && !loadError && <Spinner label="Loading events" />}
        {events && (
          <div className="overflow-x-auto rounded-[18px] border border-line bg-card">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="border-b border-line text-ink-soft">
                <tr>
                  <th className="px-5 py-3 font-semibold">Event</th>
                  <th className="px-5 py-3 font-semibold">When</th>
                  <th className="px-5 py-3 font-semibold">Seats</th>
                  <th className="px-5 py-3 font-semibold">Price</th>
                  <th className="px-5 py-3"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody>
                {events.map((e) => (
                  <tr key={e.id} className="border-b border-line/70 last:border-0">
                    <td className="px-5 py-3">
                      <Link href={`/events/${e.id}`} className="font-semibold hover:underline">
                        {e.title}
                      </Link>
                      <p className="text-ink-soft">{e.category}, {e.venue}, {e.city}</p>
                    </td>
                    <td className="px-5 py-3 whitespace-nowrap">{formatDateTime(e.startsAt)}</td>
                    <td className="px-5 py-3 tabular-nums">{e.layout.rows} × {e.layout.seatsPerRow}</td>
                    <td className="px-5 py-3">{formatMoney(e.price, e.currency)}</td>
                    <td className="px-5 py-3">
                      <div className="flex justify-end gap-2">
                        <Button size="sm" variant="outline" onClick={() => { setSaveError(null); setEditing(e); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>
                          Edit
                        </Button>
                        <Button size="sm" variant="danger" onClick={() => remove(e)}>
                          Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
