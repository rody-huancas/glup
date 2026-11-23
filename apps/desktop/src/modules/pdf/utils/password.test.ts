import { describe, expect, it } from 'vitest';
import { PROTECT_TEXTS } from '@/modules/pdf/constants/protect';
import { canProtect, isLongEnough, newPasswordProblem } from '@/modules/pdf/utils/password';

describe('new password', () => {
  it('needs at least 4 characters, counting letters and not bytes', () => {
    expect(isLongEnough('abc')).toBe(false);
    expect(isLongEnough('1234')).toBe(true);
    expect(isLongEnough('ñañá')).toBe(true);
  });

  it('only goes on when both fields match', () => {
    expect(canProtect({ password: 'glup1234', confirm: 'glup1234' })).toBe(true);
    expect(canProtect({ password: 'glup1234', confirm: 'glup123' })).toBe(false);
    expect(canProtect({ password: 'abc', confirm: 'abc' })).toBe(false);
  });

  it('says what is wrong, but not before typing', () => {
    expect(newPasswordProblem({ password: '', confirm: '' })).toBeNull();
    expect(newPasswordProblem({ password: 'ab', confirm: '' })).toBe(PROTECT_TEXTS.tooShort);
    expect(newPasswordProblem({ password: 'glup1234', confirm: '' })).toBeNull();
    expect(newPasswordProblem({ password: 'glup1234', confirm: 'glup' })).toBe(PROTECT_TEXTS.different);
    expect(newPasswordProblem({ password: 'glup1234', confirm: 'glup1234' })).toBeNull();
  });
});
