import { Router } from "express";
import { eq, and } from "drizzle-orm";
import { db, usersTable, companionsTable } from "../db/src/index.js";
import { requireAuth, AuthRequest } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { UpdateProfileSchema } from "@aura/shared";
import { logger } from "../lib/logger.js";

const EIGHTEEN_YEARS_MS = 18 * 365.25 * 24 * 60 * 60 * 1000;
const AGE_GUARD_ERROR = { error: "Age verification required. Complete onboarding before using this endpoint." };

function isAdult(dateOfBirth: string): boolean {
  return Date.now() - new Date(dateOfBirth).getTime() >= EIGHTEEN_YEARS_MS;
}

function isPlausibleDob(dateOfBirth: string): boolean {
  const t = new Date(dateOfBirth).getTime();
  if (Number.isNaN(t)) return false;
  if (t > Date.now()) return false; // not in the future
  if (t < Date.UTC(1900, 0, 1)) return false; // not absurdly old
  return true;
}

const router = Router();

const DEFAULT_COMPANIONS = [
  { personaKey: "aurora", name: "Aurora", traits: { warmth: "warm", energy: "balanced", verbosity: "balanced" }, lastMessage: "Ready to explore your thoughts with you...", isDefault: true },
  { personaKey: "orion", name: "Orion", traits: { warmth: "reserved", energy: "balanced", verbosity: "concise" }, lastMessage: "Let's tackle your goals today.", isDefault: true },
  { personaKey: "lyra", name: "Lyra", traits: { warmth: "affectionate", energy: "playful", verbosity: "expansive" }, lastMessage: "What story shall we write today?", isDefault: true },
];

// POST /api/auth/seed-companions — seed default companions for newly registered users
router.post("/auth/seed-companions", requireAuth, async (req: AuthRequest, res) => {
  try {
    const [user] = await db.select({ ageVerified: usersTable.ageVerified, onboardingDone: usersTable.onboardingDone }).from(usersTable).where(eq(usersTable.id, req.userId!)).limit(1);
    if (!user) { res.status(404).json({ error: "User not found" }); return; }
    if (!user.ageVerified || !user.onboardingDone) { res.status(403).json(AGE_GUARD_ERROR); return; }

    const existing = await db.select().from(companionsTable).where(eq(companionsTable.userId, req.userId!)).limit(1);
    if (existing.length > 0) {
      res.json({ seeded: false, message: "Companions already exist" });
      return;
    }

    for (const comp of DEFAULT_COMPANIONS) {
      await db.insert(companionsTable).values({
        userId: req.userId!,
        personaKey: comp.personaKey,
        name: comp.name,
        traits: comp.traits,
        isDefault: comp.isDefault,
        lastMessage: comp.lastMessage,
        messageCount: 0,
      });
    }

    res.status(201).json({ seeded: true });
  } catch (err) {
    logger.error({ err }, "Failed to seed companions");
    res.status(500).json({ error: "Failed to seed companions" });
  }
});

// GET /api/auth/me
router.get("/auth/me", requireAuth, async (req: AuthRequest, res) => {
  try {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId!)).limit(1);
    if (!user) { res.status(404).json({ error: "User not found" }); return; }
    res.json({
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      dateOfBirth: user.dateOfBirth,
      isPremium: user.isPremium,
      isMinor: user.isMinor,
      ageVerified: user.ageVerified,
      onboardingDone: user.onboardingDone,
      aiDisclosureAccepted: user.aiDisclosureAccepted,
      avatarColor: user.avatarColor,
      primaryCompanionId: user.primaryCompanionId,
    });
  } catch (err) {
    logger.error({ err }, "Failed to fetch user");
    res.status(500).json({ error: "Failed to fetch user" });
  }
});

// PUT /api/auth/me — update profile
router.put("/auth/me", requireAuth, validate(UpdateProfileSchema), async (req: AuthRequest, res) => {
  try {
    const { firstName, lastName, dateOfBirth, onboardingDone, aiDisclosureAccepted, tosAcceptedVersion, avatarColor, primaryCompanionId } = req.body;

    const updates: Record<string, unknown> = {};
    if (firstName !== undefined) updates.firstName = firstName;
    if (lastName !== undefined) updates.lastName = lastName;
    if (dateOfBirth !== undefined) {
      if (!isPlausibleDob(dateOfBirth)) { res.status(400).json({ error: "Please enter a valid date of birth." }); return; }
      if (!isAdult(dateOfBirth)) { res.status(403).json({ error: "You must be 18 or older to use Aura." }); return; }
      updates.dateOfBirth = dateOfBirth;
      updates.isMinor = false;
      updates.ageVerified = true;
      updates.ageVerifiedAt = new Date();
    }
    if (onboardingDone !== undefined) updates.onboardingDone = onboardingDone;
    if (aiDisclosureAccepted !== undefined) updates.aiDisclosureAccepted = aiDisclosureAccepted;
    if (tosAcceptedVersion !== undefined) {
      updates.tosAcceptedVersion = tosAcceptedVersion;
      updates.tosAcceptedAt = new Date().toISOString();
    }
    if (avatarColor !== undefined) updates.avatarColor = avatarColor;
    if (primaryCompanionId !== undefined) {
      if (primaryCompanionId === null) {
        updates.primaryCompanionId = null; // unpin the Home companion
      } else {
        // Ownership guard: only a companion the caller owns can be pinned (IDOR + FK safety).
        const [owned] = await db
          .select({ id: companionsTable.id })
          .from(companionsTable)
          .where(and(eq(companionsTable.id, primaryCompanionId), eq(companionsTable.userId, req.userId!)))
          .limit(1);
        if (!owned) { res.status(404).json({ error: "Companion not found" }); return; }
        updates.primaryCompanionId = primaryCompanionId;
      }
    }

    if (Object.keys(updates).length === 0) { res.status(400).json({ error: "Nothing to update" }); return; }

    const [user] = await db.update(usersTable).set(updates).where(eq(usersTable.id, req.userId!)).returning();
    res.json({
      id: user.id, firstName: user.firstName, lastName: user.lastName, email: user.email,
      dateOfBirth: user.dateOfBirth, isPremium: user.isPremium, isMinor: user.isMinor,
      ageVerified: user.ageVerified, onboardingDone: user.onboardingDone,
      aiDisclosureAccepted: user.aiDisclosureAccepted,
      avatarColor: user.avatarColor, primaryCompanionId: user.primaryCompanionId,
    });
  } catch (err) {
    logger.error({ err }, "Failed to update profile");
    res.status(500).json({ error: "Failed to update profile" });
  }
});

export default router;
