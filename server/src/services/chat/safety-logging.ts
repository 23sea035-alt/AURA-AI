import { db, safetyEventsTable } from "../../db/src/index.js";
import { logger } from "../../lib/logger.js";
import { captureException } from "../../lib/observability.js";
import { incrementMetric } from "../../lib/metrics.js";

// Logged on the ROOT connection, NOT the caller's turn transaction. A failed safety-event INSERT
// must never roll back — or, in Postgres, poison — the turn that delivers the user's reply, most
// critically the 988 crisis response. The failure is surfaced LOUDLY (error log + Sentry + metric),
// never silently swallowed, so a missing audit record is detectable. Because it commits before the
// subsequent autoSuspendIfNeeded count, the threshold also sees this event.
export async function logSafetyEvent(
  userId: string,
  eventType: string,
  details: { severity: string; detail?: string; content?: string },
): Promise<void> {
  try {
    await db.insert(safetyEventsTable).values({
      userId,
      eventType,
      source: "input",
      detail: details.detail ?? null,
      flaggedContent: details.content ?? null,
      severity: details.severity,
    });
    incrementMetric(`safety_event.${eventType}.${details.severity}`);
    logger.warn({ userId, eventType, severity: details.severity }, "Safety event logged");
  } catch (err) {
    logger.error({ err, userId, eventType }, "Failed to write safety event");
    captureException(err, { userId, eventType });
    incrementMetric("safety_event.write_failed");
  }
}
