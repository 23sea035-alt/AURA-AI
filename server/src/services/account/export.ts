import { eq, desc } from "drizzle-orm";
import { db, usersTable, companionsTable, messagesTable, memoriesTable, subscriptionsTable, safetyEventsTable } from "../../db/src/index.js";
import { logger } from "../../lib/logger.js";

export interface UserExport {
  exportedAt: string;
  profile: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string;
    isPremium: boolean;
    status: string;
    createdAt: string;
  };
  companions: Array<{
    id: string;
    name: string;
    personaKey: string;
    traits: unknown;
    messageCount: number;
    createdAt: string;
  }>;
  messages: Array<{
    id: string;
    companionId: string;
    role: string;
    content: string;
    createdAt: string;
  }>;
  memories: Array<{
    id: string;
    companionId: string;
    content: string;
    category: string;
    importance: number;
    createdAt: string;
  }>;
  subscriptions: Array<{
    id: string;
    tier: string;
    status: string;
    store: string;
    expiresAt: string | null;
    createdAt: string;
  }>;
  safetyEvents: Array<{
    id: string;
    eventType: string;
    source: string;
    severity: string;
    createdAt: string;
  }>;
}

export async function exportUserData(userId: string): Promise<UserExport> {
  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, userId))
    .limit(1);

  if (!user) {
    throw new Error("User not found");
  }

  const companions = await db
    .select()
    .from(companionsTable)
    .where(eq(companionsTable.userId, userId))
    .orderBy(desc(companionsTable.createdAt));

  const messages = await db
    .select()
    .from(messagesTable)
    .where(eq(messagesTable.userId, userId))
    .orderBy(desc(messagesTable.createdAt))
    .limit(1000);

  const memories = await db
    .select()
    .from(memoriesTable)
    .where(eq(memoriesTable.userId, userId))
    .orderBy(desc(memoriesTable.createdAt))
    .limit(1000);

  const subscriptions = await db
    .select()
    .from(subscriptionsTable)
    .where(eq(subscriptionsTable.userId, userId))
    .orderBy(desc(subscriptionsTable.createdAt));

  const safetyEvents = await db
    .select()
    .from(safetyEventsTable)
    .where(eq(safetyEventsTable.userId, userId))
    .orderBy(desc(safetyEventsTable.createdAt));

  logger.info({ userId }, "User data exported");

  return {
    exportedAt: new Date().toISOString(),
    profile: {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      isPremium: user.isPremium,
      status: user.status,
      createdAt: user.createdAt?.toISOString() ?? "",
    },
    companions: companions.map((c) => ({
      id: c.id,
      name: c.name,
      personaKey: c.personaKey,
      traits: c.traits,
      messageCount: c.messageCount,
      createdAt: c.createdAt?.toISOString() ?? "",
    })),
    messages: messages.map((m) => ({
      id: m.id,
      companionId: m.companionId,
      role: m.role,
      content: m.content,
      createdAt: m.createdAt?.toISOString() ?? "",
    })),
    memories: memories.map((m) => ({
      id: m.id,
      companionId: m.companionId,
      content: m.content,
      category: m.category,
      importance: m.importance,
      createdAt: m.createdAt?.toISOString() ?? "",
    })),
    subscriptions: subscriptions.map((s) => ({
      id: s.id,
      tier: s.tier,
      status: s.status,
      store: s.store,
      expiresAt: s.expiresAt?.toISOString() ?? null,
      createdAt: s.createdAt?.toISOString() ?? "",
    })),
    safetyEvents: safetyEvents.map((e) => ({
      id: e.id,
      eventType: e.eventType,
      source: e.source,
      severity: e.severity,
      createdAt: e.createdAt?.toISOString() ?? "",
    })),
  };
}
