'use client';

import { useEffect, useState } from 'react';
import { SERVICES, SEAT_RPCS, endpointId } from '@/lib/endpoints';
import { eventsApi } from '@/lib/api/events.api';
import { bookingsApi } from '@/lib/api/bookings.api';
import { notificationsApi } from '@/lib/api/notifications.api';
import { useAuth } from '@/context/AuthContext';
import EndpointConsole from '@/components/explorer/EndpointConsole';
import LoadBalancerDemo from '@/components/explorer/LoadBalancerDemo';
import { MethodBadge } from '@/components/explorer/Badges';

const ALL = SERVICES.flatMap((s) => s.endpoints);

export default function ExplorerPage() {
  const { user } = useAuth();
  const [active, setActive] = useState(ALL.find((e) => e.path === '/events/:id'));
  const [defaults, setDefaults] = useState({});

  // Pre-fill path parameters with real ids so every request works on the first click.
  useEffect(() => {
    eventsApi.list({ limit: 1 }).then((r) => r.data[0] && setDefaults((d) => ({ ...d, eventId: r.data[0].id }))).catch(() => {});
  }, []);

  useEffect(() => {
    if (!user) return;
    bookingsApi.list().then((r) => r.data[0] && setDefaults((d) => ({ ...d, bookingId: r.data[0].id }))).catch(() => {});
    notificationsApi.list().then((r) => r.data[0] && setDefaults((d) => ({ ...d, notificationId: r.data[0].id }))).catch(() => {});
  }, [user]);

  return (
    <div>
      <h1 className="font-display text-4xl font-extrabold tracking-tight sm:text-5xl">API explorer</h1>
      <p className="mt-3 max-w-2xl text-ink-soft">
        Every route the gateway exposes, ready to call. Requests go through nginx exactly like the app’s own, so you can
        see caching, auth offloading, rate limits and load balancing in the response headers.
      </p>

      <div className="mt-10 grid gap-8 lg:grid-cols-[300px_1fr]">
        <nav aria-label="Endpoints" className="flex flex-col gap-6 lg:sticky lg:top-24 lg:max-h-[calc(100dvh-7rem)] lg:self-start lg:overflow-y-auto lg:pr-2">
          {SERVICES.map((service) => (
            <div key={service.id}>
              <h2 className="font-display font-bold">{service.name}</h2>
              <p className="mt-0.5 text-xs text-ink-soft">{service.summary}</p>
              <ul className="mt-2 flex flex-col gap-0.5">
                {service.endpoints.map((e) => {
                  const selected = endpointId(e) === endpointId(active);
                  return (
                    <li key={endpointId(e)}>
                      <button
                        type="button"
                        onClick={() => setActive(e)}
                        aria-current={selected ? 'true' : undefined}
                        className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm ${
                          selected ? 'bg-card shadow-sm ring-1 ring-line' : 'hover:bg-card/70'
                        }`}
                      >
                        <MethodBadge method={e.method} />
                        <code className="truncate">{e.path}</code>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        <div className="flex min-w-0 flex-col gap-8">
          <section aria-label="Request console" className="rounded-[18px] border border-line bg-card p-5 sm:p-7">
            <EndpointConsole endpoint={active} defaults={defaults} signedIn={!!user} />
          </section>

          <div className="grid gap-6 md:grid-cols-2">
            <LoadBalancerDemo eventId={defaults.eventId} />
            <div className="rounded-[18px] border border-line bg-card p-5">
              <h3 className="font-display text-lg font-bold">seat-service (gRPC, internal)</h3>
              <p className="mt-1 text-sm text-ink-soft">
                Not reachable from the browser. booking-service calls it with deadlines and retries.
              </p>
              <ul className="mt-4 flex flex-col gap-3">
                {SEAT_RPCS.map((rpc) => (
                  <li key={rpc.name} className="text-sm">
                    <code className="font-semibold">{rpc.name}</code>
                    <p className="text-ink-soft">{rpc.description}</p>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
