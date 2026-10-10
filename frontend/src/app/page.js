'use client';

import { useCallback, useEffect, useState } from 'react';
import { eventsApi } from '@/lib/api/events.api';
import EventStrip from '@/components/events/EventStrip';
import FeaturedTicket from '@/components/events/FeaturedTicket';
import Button from '@/components/ui/Button';
import { inputClasses } from '@/components/ui/Field';
import { EmptyState, ErrorNotice, Spinner } from '@/components/ui/States';

const PAGE_SIZE = 8;

export default function HomePage() {
  const [featured, setFeatured] = useState(null);
  const [categories, setCategories] = useState([]);
  const [filters, setFilters] = useState({ q: '', category: '' });
  const [query, setQuery] = useState('');
  const [result, setResult] = useState({ data: [], pagination: null });
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState(null);

  useEffect(() => {
    eventsApi.list({ limit: 1 }).then((r) => setFeatured(r.data[0] ?? null)).catch(() => {});
    eventsApi.categories().then((r) => setCategories(r.categories)).catch(() => {});
  }, []);

  // Debounce the search box so the catalog is not queried on every keystroke.
  useEffect(() => {
    const timer = setTimeout(() => setFilters((f) => ({ ...f, q: query.trim() })), 300);
    return () => clearTimeout(timer);
  }, [query]);

  const load = useCallback(
    async (page = 1) => {
      setStatus(page === 1 ? 'loading' : 'loading-more');
      setError(null);
      try {
        const res = await eventsApi.list({ ...filters, page, limit: PAGE_SIZE });
        setResult((prev) => ({ data: page === 1 ? res.data : [...prev.data, ...res.data], pagination: res.pagination }));
        setStatus('ready');
      } catch (err) {
        setError(err);
        setStatus('error');
      }
    },
    [filters],
  );

  useEffect(() => {
    load(1);
  }, [load]);

  const { pagination } = result;
  const hasMore = pagination && pagination.page < pagination.pages;

  return (
    <>
      <section className="grid items-center gap-10 pt-4 pb-16 lg:grid-cols-[1.1fr_0.9fr] lg:gap-16">
        <div>
          <h1 className="font-display text-5xl leading-[0.95] font-extrabold tracking-[-0.03em] sm:text-7xl">
            Pick a show.
            <br />
            Then pick the seat.
          </h1>
          <p className="mt-6 max-w-lg text-lg text-ink-soft">
            Every seat on the map is live. Choose yours and we hold it for five minutes while you pay — nobody else can
            take it in the meantime.
          </p>
        </div>
        {featured ? (
          <FeaturedTicket event={featured} />
        ) : (
          <div className="hidden h-96 rounded-[18px] bg-card/60 lg:block" aria-hidden />
        )}
      </section>

      <section aria-labelledby="upcoming-heading">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h2 id="upcoming-heading" className="font-display text-3xl font-bold tracking-tight">
            Upcoming events
          </h2>
          <div className="w-full sm:w-72">
            <label htmlFor="search" className="sr-only">
              Search events
            </label>
            <input
              id="search"
              type="search"
              placeholder="Search by name, venue or city"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className={inputClasses}
            />
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-2" role="group" aria-label="Filter by category">
          {['', ...categories].map((c) => {
            const active = filters.category === c;
            return (
              <button
                key={c || 'all'}
                type="button"
                aria-pressed={active}
                onClick={() => setFilters((f) => ({ ...f, category: c }))}
                className={`rounded-full border px-4 py-1.5 text-sm font-medium transition-colors ${
                  active ? 'border-ink bg-ink text-white' : 'border-line bg-card hover:border-ink/40'
                }`}
              >
                {c || 'All'}
              </button>
            );
          })}
        </div>

        <div className="mt-8">
          {status === 'loading' && <Spinner label="Loading events" />}
          {status === 'error' && <ErrorNotice error={error} onRetry={() => load(1)} />}
          {status !== 'loading' && status !== 'error' && result.data.length === 0 && (
            <EmptyState title="No events match">Try a different search or clear the category filter.</EmptyState>
          )}
          {result.data.length > 0 && status !== 'loading' && (
            <ul className="flex flex-col gap-4">
              {result.data.map((event) => (
                <EventStrip key={event.id} event={event} />
              ))}
            </ul>
          )}
          {hasMore && status !== 'loading' && (
            <div className="mt-8 flex justify-center">
              <Button variant="outline" loading={status === 'loading-more'} onClick={() => load(pagination.page + 1)}>
                Show more events
              </Button>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
