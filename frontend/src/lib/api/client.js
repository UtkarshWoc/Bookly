// Every request goes to the same origin under /api/* — the nginx api-gateway
// (or the Next.js dev rewrite) routes it to the owning service.

const SESSION_KEY = 'bookly.session';

export class ApiError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

export function readSession() {
  try {
    return JSON.parse(window.localStorage.getItem(SESSION_KEY) || 'null');
  } catch {
    return null;
  }
}

export function writeSession(session) {
  try {
    if (session) window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    else window.localStorage.removeItem(SESSION_KEY);
  } catch {
    /* storage unavailable: session lives in memory only */
  }
}

export function newIdempotencyKey(prefix = 'req') {
  return `${prefix}-${crypto.randomUUID()}`;
}

function parse(text) {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

/**
 * Low-level call that never throws on HTTP errors. Returns status, headers,
 * parsed body and timing — used by the API explorer.
 */
export async function rawRequest(path, { method = 'GET', body, headers = {}, auth = true } = {}) {
  const token = auth ? readSession()?.token : null;
  const started = performance.now();
  const res = await fetch(`/api${path}`, {
    method,
    headers: {
      ...(body !== undefined && { 'Content-Type': 'application/json' }),
      ...(token && { Authorization: `Bearer ${token}` }),
      ...headers,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
    cache: 'no-store',
  });
  const text = await res.text();
  return {
    status: res.status,
    ok: res.ok,
    headers: Object.fromEntries(res.headers.entries()),
    data: parse(text),
    ms: Math.round(performance.now() - started),
  };
}

/** Typed call used by the app: resolves with the body or throws ApiError. */
export async function request(path, { idempotencyKey, ...options } = {}) {
  const headers = { ...(options.headers || {}), ...(idempotencyKey && { 'Idempotency-Key': idempotencyKey }) };
  let res;
  try {
    res = await rawRequest(path, { ...options, headers });
  } catch {
    throw new ApiError(0, 'Cannot reach Bookly. Check your connection and try again.');
  }
  if (!res.ok) {
    if (res.status === 401 && options.auth !== false) {
      window.dispatchEvent(new CustomEvent('bookly:unauthorized'));
    }
    const error = res.data?.error;
    throw new ApiError(res.status, error?.message || `Request failed with status ${res.status}`, error?.details);
  }
  return res.data;
}
