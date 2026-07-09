import { db, safetyEventsTable } from "../../db/src/index.js";
import { logger } from "../../lib/logger.js";
import { captureException } from "../../lib/observability.js";
import { incrementMetric } from "../../lib/metrics.js";

// Logged on the ROOT connection, NOT the caller's turn transaction. A failed safety-event INSERT
// must never roll back — or, in Postgres, poison — the turn that delivers the user's reply, most
// critically the 988 crisis response. The failure is surfaced LOUDLY (error log + Sentry + metric),
// never silently swallowed, so a missing audit record is detectable. These rows are the durable
// record a developer reviews to decide on manual account action — the app never auto-suspends.
// Map an event type to its SAFETY_SOURCE when the caller doesn't specify one, so an
// output block is recorded as source="output" (not mislabeled "input"), etc.
function sourceForEventType(eventType: string): string {
  switch (eventType) {
    case "output_blocked": return "output";
    case "injection_detected": return "injection";
    case "user_reported": return "user_report";
    default: return "input"; // input_blocked, crisis_detected
  }
}

export async function logSafetyEvent(
  userId: string,
  eventType: string,
  details: {
    severity: string;
    detail?: string;
    content?: string;
    source?: string;
    category?: string;
    model?: string;
    companionId?: string;
    messageId?: string;
  },
): Promise<void> {
  try {
    await db.insert(safetyEventsTable).values({
      userId,
      companionId: details.companionId ?? null,
      messageId: details.messageId ?? null,
      eventType,
      source: details.source ?? sourceForEventType(eventType),
      category: details.category ?? null,
      model: details.model ?? null,
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
