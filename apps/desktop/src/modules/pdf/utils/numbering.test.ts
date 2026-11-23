import { describe, expect, it } from 'vitest';
import { DEFAULT_NUMBERING, NUMBERING_TEXTS } from '@/modules/pdf/constants/numbering';
import { lastNumber, numberingProblem, pageLabel, parseWhole } from '@/modules/pdf/utils/numbering';

describe('page numbering', () => {
  it('writes the three formats', () => {
    expect(pageLabel({ format: 'number', number: 3, last: 12 })).toBe('3');
    expect(pageLabel({ format: 'page', number: 3, last: 12 })).toBe('Página 3');
    expect(pageLabel({ format: 'of-total', number: 3, last: 12 })).toBe('3 de 12');
  });

  it('counts the last number from where numbering starts', () => {
    expect(lastNumber(DEFAULT_NUMBERING, 12)).toBe(12);
    expect(lastNumber({ ...DEFAULT_NUMBERING, startPage: 2 }, 12)).toBe(11);
    expect(lastNumber({ ...DEFAULT_NUMBERING, startPage: 2, firstNumber: 5 }, 12)).toBe(15);
  });

  it('only takes whole numbers from the fields', () => {
    expect(parseWhole(' 2 ')).toBe(2);
    expect(parseWhole('')).toBeNull();
    expect(parseWhole('2,5')).toBeNull();
    expect(parseWhole('-1')).toBeNull();
  });

  it('cannot start past the last page or below 1', () => {
    expect(numberingProblem({ options: DEFAULT_NUMBERING, total: 12 })).toBeNull();
    expect(numberingProblem({ options: { ...DEFAULT_NUMBERING, startPage: 13 }, total: 12 })).toBe(NUMBERING_TEXTS.badStart(12));
    expect(numberingProblem({ options: { ...DEFAULT_NUMBERING, startPage: 0 }, total: 12 })).toBe(NUMBERING_TEXTS.badStart(12));
    expect(numberingProblem({ options: { ...DEFAULT_NUMBERING, firstNumber: 0 }, total: 12 })).toBe(NUMBERING_TEXTS.badNumber);
    // While the page count is unknown, any page from 1 up is fine.
    expect(numberingProblem({ options: { ...DEFAULT_NUMBERING, startPage: 40 }, total: null })).toBeNull();
  });
});
