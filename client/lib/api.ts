// Authenticated fetch helper for the live backend (lib/live.ts is the only
// consumer). Auth is a Clerk session JWT, injected via setTokenProvider so this
// module never imports the Clerk SDK (mock mode must not touch it).
//
// Server envelope rules (server/src/utils/responses.ts):
//   - most routes:  { success: true, data } | { success: false, error, code? }
//   - /auth/*, /healthz, middleware-level 401/403/404 and rate limiters reply
//     RAW ({ error, code? } or a bare object) — `raw: true` opts out of
//     envelope unwrapping for those.
import { apiBaseUrl } from '@/lib/env';

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

type TokenProvider = () => Promise<string | null>;
let tokenProvider: TokenProvider = async () => null;

/** Registered once by the live auth layer (lib/clerk.ts). */
export function setTokenProvider(fn: TokenProvider) {
  tokenProvider = fn;
}

interface RequestOpts {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  /** Route replies bare JSON (no { success, data } envelope). */
  raw?: boolean;
  /** Abort after this many ms (default 30s). Long-running calls (the chat turn) override upward. */
  timeoutMs?: number;
}

// Default request deadline. Without one, a stalled response (dead proxy, hung server) leaves the
// awaiting screen wedged forever — the WS path has a 90s watchdog; REST needs its own.
const DEFAULT_TIMEOUT_MS = 30_000;

// Wiring-debug tap: EXPO_PUBLIC_LOG_API=true in client/.env logs every live
// request/response line to Metro (dev only; restart Metro after flipping).
const LOG_API = __DEV__ && process.env.EXPO_PUBLIC_LOG_API === 'true';

export async function api<T>(path: string, opts: RequestOpts = {}): Promise<T> {
  const token = await tokenProvider();
  const method = opts.method ?? 'GET';
  const started = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), opts.timeoutMs ?? DEFAULT_TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetch(`${apiBaseUrl()}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
      signal: controller.signal,
    });
  } catch (err) {
    // Our own deadline fired → normalize to an ApiError so the existing failed-request UI paths
    // (tap-to-retry etc.) take over. Genuine network errors keep their original shape.
    if (controller.signal.aborted) throw new ApiError('Request timed out', 408, 'TIMEOUT');
    throw err;
  } finally {
    clearTimeout(timer);
  }
  if (LOG_API) {
    // eslint-disable-next-line no-console
    console.log(`[api] ${method} ${path} → ${res.status} (${Date.now() - started}ms)`);
  }

  let json: any = null;
  try {
    json = await res.json();
  } catch {
    // Non-JSON body (proxy error page, empty 204) — fall through on status.
  }

  if (!res.ok) {
    throw new ApiError(json?.error ?? `HTTP ${res.status}`, res.status, json?.code);
  }
  if (opts.raw) return json as T;
  if (json && json.success === false) {
    throw new ApiError(json.error ?? 'Request failed', res.status, json.code);
  }
  return (json && 'data' in json ? json.data : json) as T;
}
