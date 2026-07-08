import { describe, expect, it } from 'vitest';

import fixture from '../../scripts/dev/demo-user.fixture.json';
import { DEMO } from '../../constants/demo';
import type { UserProfile } from '../profile';

// sim-storage.py reset-demo stages this fixture as the `user` key (everything else re-seeds
// from client code). This test pins it to the demo canon so the fixture can't silently rot
// when the profile model or demo story changes.
describe('reset-demo user fixture', () => {
  it('is assignable to UserProfile and matches the demo canon', () => {
    const profile: UserProfile = fixture; // compile-time drift check on field names/types

    expect(profile.firstName).toBe(DEMO.user.firstName);
    expect(profile.lastName).toBe(DEMO.user.lastName);
    expect(profile.email).toBe(DEMO.user.email);
    expect(profile.dateOfBirth).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('stages a fully-onboarded, consented, free-tier user', () => {
    expect(fixture.ageVerified).toBe(true);
    expect(fixture.onboardingDone).toBe(true);
    expect(fixture.aiDisclosureAccepted).toBe(true);
    expect(fixture.thirdPartyAiConsentAt).toBeTruthy();
    expect(fixture.isPremium).toBe(false);
  });
});
