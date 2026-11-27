// Every request goes to the same origin under /api/* — the nginx api-gateway
// (or the Next.js dev rewrite) routes it to the owning service.

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '/api';
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

export class ApiError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

export function readCookie(name) {
  if (typeof document === 'undefined' || !document.cookie) return null;
  for (const part of document.cookie.split(';')) {
    const idx = part.indexOf('=');
    if (idx <= 0) continue;
    if (part.slice(0, idx).trim() === name) {
      try {
        return decodeURIComponent(part.slice(idx + 1).trim());
      } catch {
        return part.slice(idx + 1).trim();
      }
    }
  }
  return null;
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
 * Auth relies on the httpOnly `bookly_token` cookie + `X-CSRF-Token` header.
 */
export async function rawRequest(path, { method = 'GET', body, headers = {}, auth = true } = {}) {
  const upperMethod = method.toUpperCase();
  const csrfToken = auth && !SAFE_METHODS.has(upperMethod) ? readCookie('bookly_csrf') : null;
  const started = performance.now();
  const res = await fetch(`${API_BASE}${path}`, {
    method: upperMethod,
    credentials: auth ? 'include' : 'omit',
    headers: {
      ...(body !== undefined && { 'Content-Type': 'application/json' }),
      ...(csrfToken && { 'X-CSRF-Token': csrfToken }),
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
