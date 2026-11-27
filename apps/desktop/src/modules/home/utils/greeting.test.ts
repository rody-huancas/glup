import { describe, expect, it } from 'vitest';
import { firstName, greetingFor, greetingLine, greetingName, tidyName } from '@/modules/home/utils/greeting';

describe('the greeting of Inicio', () => {
  it('follows the hour', () => {
    expect([4, 5, 11, 12, 19, 20, 23, 0].map(greetingFor)).toEqual([
      'Buenas noches', 'Buenos días', 'Buenos días', 'Buenas tardes', 'Buenas tardes', 'Buenas noches', 'Buenas noches', 'Buenas noches',
    ]);
    expect(greetingLine({ hour: 9, name: 'Ana' })).toBe('¡Buenos días, Ana!');
    expect(greetingLine({ hour: 15, name: null })).toBe('¡Buenas tardes!');
  });

  it('uses the name written in Ajustes, then the first name of the account, then none', () => {
    expect(greetingName({ custom: 'Anita', account: 'Ana Torres' })).toBe('Anita');
    expect(greetingName({ custom: '  Señora Ana  ', account: 'Ana Torres' })).toBe('Señora Ana');
    expect(greetingName({ custom: '   ', account: '  Ana   Torres ' })).toBe('Ana');
    expect(greetingName({ custom: null, account: null })).toBeNull();
    expect(greetingName({ custom: null, account: '   ' })).toBeNull();
    expect(firstName('Ana')).toBe('Ana');
  });

  it('starts with a capital when it comes all in capitals or all in small letters', () => {
    expect(greetingName({ custom: null, account: 'ANA TORRES' })).toBe('Ana');
    expect(greetingName({ custom: 'ana', account: null })).toBe('Ana');
    expect(tidyName('SEÑOR ÁNGEL')).toBe('Señor Ángel');
    expect(tidyName('ñandú')).toBe('Ñandú');
    // Already mixed: as written.
    expect(tidyName('McDonald')).toBe('McDonald');
    expect(greetingName({ custom: 'DeLuca', account: null })).toBe('DeLuca');
  });
});
