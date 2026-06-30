// Lightweight in-process counters for the operationally-important signals (safety events,
// moderation decisions, rate-limit rejections). Per-instance and reset on restart — intended to be
// scraped/aggregated, or read via GET /api/admin/metrics. Cheap enough to call on every event.
const counters = new Map<string, number>();

export function incrementMetric(name: string, by = 1): void {
  counters.set(name, (counters.get(name) ?? 0) + by);
}

export function getMetrics(): Record<string, number> {
  return Object.fromEntries(counters);
}

// Test/maintenance helper.
export function resetMetrics(): void {
  counters.clear();
}
