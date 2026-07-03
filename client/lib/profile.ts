// Pure user-profile model + storage migration. No React/RN imports — unit
// tested in __tests__/profile.test.ts. AppContext re-exports UserProfile.

// Matches the backend user shape (firstName/lastName + ISO dateOfBirth + UUID
// string ids — the old `name`/`birthYear` shape is gone server-side).
export interface UserProfile {
  id?: string;
  firstName: string;
  lastName: string;
  email: string;
  /** ISO date string (YYYY-MM-DD). */
  dateOfBirth?: string;
  isMinor?: boolean;
  ageVerified?: boolean;
  onboardingDone?: boolean;
  aiDisclosureAccepted?: boolean;
  /** Apple 5.1.2(i) — unbundled consent to third-party AI processing (timestamp = auditable). */
  thirdPartyAiConsentAt?: string | null;
  isPremium?: boolean;
  bio?: string;
  avatarUri?: string;
  /** Chosen monogram tone for the initials avatar. Backed by users.avatarColor once the API lands. */
  avatarColor?: string;
}

// One-time storage migration: earlier builds stored `name` + `birthYear`; the
// backend (and this client now) uses firstName/lastName + ISO dateOfBirth.
 
export function migrateProfile(raw: any): UserProfile {
  if (raw && typeof raw.name === 'string' && raw.firstName === undefined) {
    const [first, ...rest] = raw.name.trim().split(/\s+/);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { name: _name, birthYear, ...keep } = raw;
    return {
      ...keep,
      firstName: first || raw.email?.split('@')[0] || '',
      lastName: rest.join(' '),
      dateOfBirth: typeof birthYear === 'number' ? `${birthYear}-01-01` : undefined,
    };
  }
  return raw as UserProfile;
}
