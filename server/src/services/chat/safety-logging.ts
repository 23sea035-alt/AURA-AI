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

// ── E-3: tiered content retention (data-retention-policy.md §3) ──────────────────────────────────
// The tier, assigned HERE at write time, decides how much raw flagged content is stored and how
// long it survives before retention.ts's scrub job nulls it (the metadata row is permanent):
//   T1 Critical — crisis + zero-tolerance (sexual/minors): full content, scrubbed after ~90d.
//   T2 Standard — other input blocks, model-output blocks, user reports: truncated snippet, ~180d.
//   T3 Low      — injection attempts: NO raw content stored at all.
// v1 simplification (LEGAL-REVIEW): the policy grades REPEATED injection as T2; detecting repeats
// costs a count query per write, so v1 stores no injection content at all — the strictly more
// private direction. Documented as an as-built divergence in the policy doc.
export type ContentTier = "T1" | "T2" | "T3";

export function contentTierFor(eventType: string, category?: string): ContentTier {
  if (eventType === "crisis_detected") return "T1";
  if (category === "sexual/minors") return "T1";
  if (eventType === "injection_detected") return "T3";
  return "T2";
}

// T2 keeps a bounded snippet, not the full prose (the policy's "matched span + tight context";
// v1 approximates with a prefix — the moderation match is usually early in a chat message).
const T2_SNIPPET_MAX_CHARS = 300;

function shapeContentForTier(tier: ContentTier, content: string | undefined): string | null {
  if (!content) return null;
  switch (tier) {
    case "T3": return null;
    case "T2": return content.length > T2_SNIPPET_MAX_CHARS ? `${content.slice(0, T2_SNIPPET_MAX_CHARS)}…` : content;
    case "T1": return content;
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
    const tier = contentTierFor(eventType, details.category);
    await db.insert(safetyEventsTable).values({
      userId,
      companionId: details.companionId ?? null,
      messageId: details.messageId ?? null,
      eventType,
      source: details.source ?? sourceForEventType(eventType),
      category: details.category ?? null,
      model: details.model ?? null,
      detail: details.detail ?? null,
      flaggedContent: shapeContentForTier(tier, details.content),
      contentTier: tier,
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
