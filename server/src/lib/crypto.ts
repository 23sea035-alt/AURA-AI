import { createHmac } from "crypto";
import { getEnv } from "../config/env.js";

// Keyed hash of a ban identifier (email / OAuth sub). HMAC-SHA256 (not SHA-256 of identifier+pepper):
// a true keyed MAC, immune to length-extension, and the standard primitive for peppered hashing.
export function hashIdentifier(identifier: string): string {
  const pepper = getEnv().BANNED_IDENTITY_PEPPER;
  return createHmac("sha256", pepper).update(identifier).digest("hex");
}
