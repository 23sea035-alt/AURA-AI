// B-2: the REST helper must never hang forever — a stalled response aborts on a deadline and
// surfaces as an ApiError so the existing failed-request UI paths (tap-to-retry) take over.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// api.ts reads the React Native __DEV__ global at module scope — define it before the
// (hoisted) import evaluates.
vi.hoisted(() => {
  (globalThis as { __DEV__?: boolean }).__DEV__ = false;
});
vi.mock('@/lib/env', () => ({ apiBaseUrl: () => 'http://test.local/api' }));

import { api, ApiError } from '../api';

/** A fetch that never resolves, but rejects with AbortError when its signal fires. */
function hangingFetch() {
  return vi.fn((_url: unknown, init?: { signal?: AbortSignal }) =>
    new Promise((_resolve, reject) => {
      init?.signal?.addEventListener('abort', () =>
        reject(Object.assign(new Error('Aborted'), { name: 'AbortError' })),
      );
    }),
  );
}

function okFetch(payload: unknown) {
  return vi.fn(async () => ({ ok: true, status: 200, json: async () => payload }));
}

describe('api() request timeout', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('aborts a hung request after the default 30s and throws ApiError TIMEOUT', async () => {
    vi.stubGlobal('fetch', hangingFetch());
    const pending = api('/slow');
    const assertion = expect(pending).rejects.toMatchObject({ code: 'TIMEOUT', status: 408 });
    await vi.advanceTimersByTimeAsync(30_000);
    await assertion;
  });

  it('honors a per-call timeoutMs override', async () => {
    vi.stubGlobal('fetch', hangingFetch());
    const pending = api('/slow', { timeoutMs: 5_000 });
    const assertion = expect(pending).rejects.toBeInstanceOf(ApiError);
    await vi.advanceTimersByTimeAsync(5_000);
    await assertion;
  });

  it('does not time out a request that completes in time', async () => {
    vi.stubGlobal('fetch', okFetch({ success: true, data: { ok: 1 } }));
    await expect(api('/fast')).resolves.toEqual({ ok: 1 });
    // Advancing past the deadline after completion must not blow up (timer was cleared).
    await vi.advanceTimersByTimeAsync(60_000);
  });
});
