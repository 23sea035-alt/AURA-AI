import { eq } from "drizzle-orm";
import { db, deviceTokensTable } from "../../db/src/index.js";
import { logger } from "../../lib/logger.js";

/**
 * APNs "your companion replied" push — fired only when the user has NO live WebSocket
 * connection for this companion (they're away). Best-effort: a push failure never affects
 * the turn. Dynamic imports avoid a static services→websocket import cycle.
 */
export async function maybeSendReplyPush(userId: string, companionId: string, companionName: string): Promise<void> {
  try {
    const { connectionManager } = await import("../../websocket/connection-manager.js");
    if (connectionManager.isConnected(userId, companionId)) return; // user is live — deliver over WS

    const tokens = await db.select().from(deviceTokensTable).where(eq(deviceTokensTable.userId, userId));
    if (tokens.length === 0) return;

    const { sendPushNotification } = await import("../notifications/apns.js");
    for (const t of tokens) {
      await sendPushNotification(t.token, {
        alert: { title: companionName, body: "Sent you a reply" },
        badge: 1,
        data: { userId, companionName },
      });
    }
  } catch (err) {
    logger.error({ err }, "Failed to send reply push");
  }
}
