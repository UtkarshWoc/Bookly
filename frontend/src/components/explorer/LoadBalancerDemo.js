'use client';

import { useState } from 'react';
import { rawRequest } from '@/lib/api/client';
import Button from '@/components/ui/Button';

const REQUESTS = 12;

// Fires a burst of requests at booking-service and tallies which replica answered each.
export default function LoadBalancerDemo({ eventId }) {
  const [tally, setTally] = useState(null);
  const [running, setRunning] = useState(false);

  const run = async () => {
    setRunning(true);
    const counts = {};
    for (let i = 0; i < REQUESTS; i += 1) {
      // eslint-disable-next-line no-await-in-loop
      const res = await rawRequest(`/availability/${eventId}`, { auth: false });
      const replica = (res.headers['x-served-by'] || 'unknown').replace('booking-service@', '');
      counts[replica] = (counts[replica] || 0) + 1;
    }
    setTally(counts);
    setRunning(false);
  };

  return (
    <div className="rounded-[18px] border border-line bg-card p-5">
      <h3 className="font-display text-lg font-bold">Watch the load balancer</h3>
      <p className="mt-1 text-sm text-ink-soft">
        Sends {REQUESTS} requests through nginx and counts which booking-service replica answered each one.
      </p>
      <Button size="sm" variant="outline" className="mt-4" onClick={run} loading={running} disabled={!eventId}>
        Send {REQUESTS} requests
      </Button>
      {tally && (
        <ul className="mt-4 flex flex-col gap-2">
          {Object.entries(tally).map(([replica, count]) => (
            <li key={replica} className="text-sm">
              <div className="flex justify-between font-mono">
                <span className="truncate">{replica}</span>
                <span className="font-semibold">{count}</span>
              </div>
              <div className="mt-1 h-2 rounded-full bg-paper">
                <div className="h-full rounded-full bg-teal" style={{ width: `${(count / REQUESTS) * 100}%` }} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
