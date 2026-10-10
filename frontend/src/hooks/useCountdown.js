'use client';

import { useEffect, useState } from 'react';

// Seconds remaining until `target` (a date string), ticking once per second.
export function useCountdown(target) {
  const compute = () => (target ? Math.max(0, Math.round((new Date(target).getTime() - Date.now()) / 1000)) : 0);
  const [seconds, setSeconds] = useState(compute);

  useEffect(() => {
    setSeconds(compute());
    if (!target) return undefined;
    const timer = setInterval(() => setSeconds(compute()), 1000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target]);

  return seconds;
}
