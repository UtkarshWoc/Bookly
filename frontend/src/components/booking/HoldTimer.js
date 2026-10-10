'use client';

import { useEffect } from 'react';
import { useCountdown } from '@/hooks/useCountdown';

export default function HoldTimer({ expiresAt, totalSeconds = 300, onExpire }) {
  const seconds = useCountdown(expiresAt);
  const minutes = Math.floor(seconds / 60);
  const pct = Math.min(100, (seconds / totalSeconds) * 100);
  const urgent = seconds <= 60;

  useEffect(() => {
    if (seconds === 0) onExpire?.();
  }, [seconds, onExpire]);

  return (
    <div className={`rounded-2xl px-5 py-4 ${urgent ? 'bg-rose-soft' : 'bg-marigold-soft'}`}>
      <div className="flex items-baseline justify-between gap-4">
        <p className={`font-semibold ${urgent ? 'text-rose' : 'text-marigold-deep'}`}>
          {seconds > 0 ? 'Your seats are held' : 'Your hold has ended'}
        </p>
        <p className="font-display text-2xl font-bold tabular-nums" aria-live={urgent ? 'polite' : 'off'}>
          {minutes}:{String(seconds % 60).padStart(2, '0')}
        </p>
      </div>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/70">
        <div className={`hold-bar h-full rounded-full ${urgent ? 'bg-rose' : 'bg-marigold'}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
