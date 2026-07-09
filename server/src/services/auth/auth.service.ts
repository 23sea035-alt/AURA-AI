import { eq, inArray } from "drizzle-orm";
import { db, usersTable, bannedIdentitiesTable } from "../../db/src/index.js";
import { hashIdentifier } from "../../lib/crypto.js";

export async function lookupLocalUser(clerkUserId: string): Promise<typeof usersTable.$inferSelect | null> {
  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.clerkUserId, clerkUserId))
    .limit(1);
  return user ?? null;
}

export async function upsertUserFromClerk(data: {
  clerkUserId: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  role?: string;
}): Promise<typeof usersTable.$inferSelect> {
  // Only accept known roles from Clerk public_metadata (set via dashboard/backend API,
  // not user-writable). Anything else is ignored.
  const normalizedRole = data.role === "admin" || data.role === "user" ? data.role : undefined;

  const updateSet: Record<string, unknown> = {
    email: data.email.toLowerCase(),
    firstName: data.firstName ?? null,
    lastName: data.lastName ?? null,
  };
  // Only touch role when the webhook explicitly carries one — otherwise PRESERVE the
  // existing role, so a user.updated event without metadata can't silently demote an admin.
  if (normalizedRole !== undefined) updateSet.role = normalizedRole;

  const [user] = await db
    .insert(usersTable)
    .values({
      clerkUserId: data.clerkUserId,
      email: data.email.toLowerCase(),
      firstName: data.firstName ?? null,
      lastName: data.lastName ?? null,
      role: normalizedRole ?? "user",
    })
    .onConflictDoUpdate({
      target: usersTable.clerkUserId,
      set: updateSet,
    })
    .returning();
  return user;
}

export async function deleteUserByClerkId(clerkUserId: string): Promise<void> {
  await db
    .delete(usersTable)
    .where(eq(usersTable.clerkUserId, clerkUserId));
}

export async function checkBan(
  email: string,
  subs?: { appleSub?: string; googleSub?: string },
): Promise<boolean> {
  // Check the email hash plus any OAuth sub hashes — blocks ban evasion via a new email
  // on the same Apple/Google identity (when those identifiers were banned).
  const hashes = [hashIdentifier(email.toLowerCase())];
  if (subs?.appleSub) hashes.push(hashIdentifier(subs.appleSub));
  if (subs?.googleSub) hashes.push(hashIdentifier(subs.googleSub));
  const [match] = await db
    .select()
    .from(bannedIdentitiesTable)
    .where(inArray(bannedIdentitiesTable.identifierHash, hashes))
    .limit(1);
  return !!match;
}
