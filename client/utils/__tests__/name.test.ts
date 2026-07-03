import { describe, expect, it } from 'vitest';

import { autoNumberName, friendlyFirstName } from '../name';

describe('friendlyFirstName', () => {
  it('humanizes email-derived names', () => {
    expect(friendlyFirstName('maya.chen')).toBe('Maya');
    expect(friendlyFirstName('jean_luc')).toBe('Jean');
  });
  it('takes the first name from a full name', () => {
    expect(friendlyFirstName('Maya Chen')).toBe('Maya');
  });
  it('falls back to "there"', () => {
    expect(friendlyFirstName(undefined)).toBe('there');
    expect(friendlyFirstName('  ')).toBe('there');
  });
});

describe('autoNumberName', () => {
  it('keeps an unused name', () => {
    expect(autoNumberName('Aurora', ['Orion', 'Lyra'])).toBe('Aurora');
  });
  it('numbers a clash, case-insensitively', () => {
    expect(autoNumberName('Aurora', ['aurora'])).toBe('Aurora 2');
  });
  it('skips already-taken numbers', () => {
    expect(autoNumberName('Aurora', ['Aurora', 'Aurora 2', 'aurora 3'])).toBe('Aurora 4');
  });
});
