import { describe, expect, it } from 'vitest';

import { migrateProfile } from '../profile';

describe('migrateProfile', () => {
  it('converts the legacy name/birthYear shape', () => {
    const migrated = migrateProfile({
      name: 'Maya Chen',
      email: 'maya.chen@example.com',
      birthYear: 1998,
      isPremium: false,
    });
    expect(migrated).toMatchObject({
      firstName: 'Maya',
      lastName: 'Chen',
      dateOfBirth: '1998-01-01',
      email: 'maya.chen@example.com',
      isPremium: false,
    });
    expect('name' in migrated).toBe(false);
    expect('birthYear' in migrated).toBe(false);
  });

  it('derives a first name from the email when the legacy name is empty', () => {
    expect(migrateProfile({ name: '', email: 'jo@example.com' }).firstName).toBe('jo');
  });

  it('passes the new shape through untouched', () => {
    const fresh = { firstName: 'Maya', lastName: 'Chen', email: 'm@example.com' };
    expect(migrateProfile(fresh)).toBe(fresh);
  });
});
