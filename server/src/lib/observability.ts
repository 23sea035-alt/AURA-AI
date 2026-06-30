// Centralized error-tracking shim. Sentry is optional (DSN may be unset); when configured,
// it is initialized once at boot and `captureException` forwards unhandled errors to it.
// Without a DSN this degrades to log-only visibility (the caller still logs).
import { logger } from "./logger.js";

type SentryModule = typeof import("@sentry/node");

let sentry: SentryModule | null = null;

export async function initObservability(dsn: string | undefined, environment: string): Promise<void> {
  if (!dsn) {
    logger.info("Sentry DSN not set — error tracking is log-only");
    return;
  }
  try {
    sentry = await import("@sentry/node");
    sentry.init({
      dsn,
      environment,
      tracesSampleRate: environment === "production" ? 0.1 : 0,
    });
    logger.info("Sentry initialized");
  } catch (err) {
    sentry = null;
    logger.warn({ err }, "Sentry failed to initialize — continuing log-only");
  }
}

export function captureException(err: unknown, context?: Record<string, unknown>): void {
  if (!sentry) return;
  try {
    sentry.captureException(err, context ? { extra: context } : undefined);
  } catch {
    // Never let error reporting throw on the error path.
  }
}
