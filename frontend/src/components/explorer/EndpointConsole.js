'use client';

import { useEffect, useMemo, useState } from 'react';
import { newIdempotencyKey, rawRequest } from '@/lib/api/client';
import Button from '@/components/ui/Button';
import { inputClasses } from '@/components/ui/Field';
import { MethodBadge, AccessBadge } from './Badges';

// Headers that tell the story of the architecture, surfaced above the raw response.
const INTERESTING_HEADERS = [
  ['x-gateway-cache', 'nginx proxy_cache'],
  ['x-cache', 'Redis cache-aside'],
  ['x-served-by', 'Replica that answered'],
  ['x-upstream-addr', 'Upstream address'],
  ['idempotent-replayed', 'Replayed from idempotency store'],
  ['retry-after', 'Retry after (s)'],
  ['x-request-id', 'Request id'],
];

// ":id" means a different resource depending on the route.
function defaultFor(param, path, defaults) {
  if (param !== 'id') return defaults[param] || '';
  if (path.startsWith('/bookings')) return defaults.bookingId || '';
  if (path.startsWith('/notifications')) return defaults.notificationId || '';
  return defaults.eventId || '';
}

function statusTone(status) {
  if (status >= 500) return 'bg-rose text-white';
  if (status >= 400) return 'bg-rose-soft text-rose';
  return 'bg-teal-soft text-teal';
}

export default function EndpointConsole({ endpoint, defaults, signedIn }) {
  const params = useMemo(() => [...endpoint.path.matchAll(/:(\w+)/g)].map((m) => m[1]), [endpoint.path]);

  const initialBody = () => {
    if (!endpoint.body) return '';
    const text = JSON.stringify(endpoint.body, null, 2);
    return defaults.eventId ? text.replace('":eventId"', `"${defaults.eventId}"`) : text;
  };

  const [values, setValues] = useState({});
  const [query, setQuery] = useState(endpoint.query || '');
  const [body, setBody] = useState(initialBody);
  const [idemKey, setIdemKey] = useState(() => newIdempotencyKey('explorer'));
  const [sendToken, setSendToken] = useState(true);
  const [response, setResponse] = useState(null);
  const [sending, setSending] = useState(false);
  const [bodyError, setBodyError] = useState(null);

  useEffect(() => {
    setValues(Object.fromEntries(params.map((p) => [p, defaultFor(p, endpoint.path, defaults)])));
    setQuery(endpoint.query || '');
    setBody(initialBody());
    setResponse(null);
    setBodyError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endpoint, defaults]);

  const path = endpoint.path.replace(/:(\w+)/g, (_, p) => encodeURIComponent(values[p] || `:${p}`));
  const url = `/api${path}${query ? `?${query}` : ''}`;

  const send = async () => {
    let parsed;
    if (body.trim()) {
      try {
        parsed = JSON.parse(body);
      } catch {
        setBodyError('Body is not valid JSON.');
        return;
      }
    }
    setBodyError(null);
    setSending(true);
    try {
      const res = await rawRequest(`${path}${query ? `?${query}` : ''}`, {
        method: endpoint.method,
        body: parsed,
        auth: sendToken,
        headers: endpoint.idempotent && idemKey ? { 'Idempotency-Key': idemKey } : {},
      });
      setResponse(res);
    } catch (err) {
      setResponse({ status: 0, data: { error: err.message }, headers: {}, ms: 0 });
    } finally {
      setSending(false);
    }
  };

  const highlights = response ? INTERESTING_HEADERS.filter(([h]) => response.headers[h]) : [];

  return (
    <div className="flex flex-col gap-5">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <MethodBadge method={endpoint.method} />
          <code className="text-lg font-semibold break-all">{endpoint.path}</code>
          <AccessBadge access={endpoint.access} />
        </div>
        <p className="mt-2 text-ink-soft">{endpoint.description}</p>
        {endpoint.access !== 'public' && !signedIn && (
          <p className="mt-2 text-sm text-marigold-deep">Sign in first — this route needs a token, otherwise nginx answers 401.</p>
        )}
      </div>

      {params.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2">
          {params.map((p) => (
            <label key={p} className="text-sm font-semibold">
              :{p}
              <input
                className={`${inputClasses} mt-1 font-mono text-sm`}
                value={values[p] || ''}
                onChange={(e) => setValues((v) => ({ ...v, [p]: e.target.value }))}
              />
            </label>
          ))}
        </div>
      )}

      {endpoint.method === 'GET' && (
        <label className="text-sm font-semibold">
          Query string
          <input className={`${inputClasses} mt-1 font-mono text-sm`} value={query} placeholder="key=value&other=value" onChange={(e) => setQuery(e.target.value)} />
        </label>
      )}

      {endpoint.body && (
        <label className="text-sm font-semibold">
          JSON body
          <textarea
            className={`${inputClasses} mt-1 h-auto min-h-40 py-2.5 font-mono text-[13px] leading-relaxed`}
            value={body}
            spellCheck={false}
            onChange={(e) => setBody(e.target.value)}
            aria-invalid={bodyError ? 'true' : undefined}
          />
          {bodyError && <span className="mt-1 block font-normal text-rose">{bodyError}</span>}
        </label>
      )}

      {endpoint.idempotent && (
        <div className="text-sm">
          <span className="font-semibold">Idempotency-Key</span>
          <div className="mt-1 flex gap-2">
            <input className={`${inputClasses} font-mono text-sm`} value={idemKey} onChange={(e) => setIdemKey(e.target.value)} />
            <Button variant="outline" size="sm" className="h-11" onClick={() => setIdemKey(newIdempotencyKey('explorer'))}>
              New key
            </Button>
          </div>
          <p className="mt-1 text-ink-soft">Send twice with the same key and the second response is replayed, not repeated.</p>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-paper px-4 py-3">
        <code className="text-sm break-all">
          <span className="font-semibold">{endpoint.method}</span> {url}
        </code>
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={sendToken} onChange={(e) => setSendToken(e.target.checked)} className="size-4 accent-ink" />
            Send my token
          </label>
          <Button onClick={send} loading={sending}>
            Send request
          </Button>
        </div>
      </div>

      {response && (
        <div className="overflow-hidden rounded-xl border border-line">
          <div className="flex items-center gap-3 border-b border-line bg-paper px-4 py-2.5 text-sm">
            <span className={`rounded-full px-2.5 py-0.5 font-bold ${statusTone(response.status)}`}>{response.status || 'Network error'}</span>
            <span className="text-ink-soft">{response.ms} ms</span>
          </div>
          {highlights.length > 0 && (
            <dl className="grid gap-x-6 gap-y-2 border-b border-line px-4 py-3 text-sm sm:grid-cols-2">
              {highlights.map(([header, label]) => (
                <div key={header} className="min-w-0">
                  <dt className="text-ink-soft">{label}</dt>
                  <dd className="truncate font-mono font-semibold" title={response.headers[header]}>
                    {response.headers[header]}
                  </dd>
                </div>
              ))}
            </dl>
          )}
          <pre className="max-h-[28rem] overflow-auto bg-ink px-4 py-3 font-mono text-[13px] leading-relaxed text-[#e7eaf3]">
            {response.data === null ? '(empty body)' : JSON.stringify(response.data, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
