import { describe, expect, it } from 'vitest';
import type { KeyPress } from '@/modules/shortcuts/interfaces/keyPress';
import { shortcutFromPress, shortcutKeys } from '@/modules/shortcuts/utils/shortcut';

const press = (code: string, modifiers: Partial<Omit<KeyPress, 'code'>> = {}): KeyPress => ({
  code,
  ctrlKey  : false,
  altKey   : false,
  shiftKey : false,
  metaKey  : false,
  ...modifiers,
});

describe('shortcutFromPress', () => {
  it('builds the shortcut in a fixed order, as Rust reads it', () => {
    expect(shortcutFromPress(press('KeyT', { ctrlKey: true, altKey: true, shiftKey: true }))).toEqual({ kind: 'shortcut', shortcut: 'Ctrl+Alt+Shift+KeyT' });
    expect(shortcutFromPress(press('Digit4', { metaKey: true, shiftKey: true }))).toEqual({ kind: 'shortcut', shortcut: 'Shift+Super+Digit4' });
    expect(shortcutFromPress(press('F9', { altKey: true }))).toEqual({ kind: 'shortcut', shortcut: 'Alt+F9' });
  });

  it('waits while only modifiers are down', () => {
    expect(shortcutFromPress(press('ControlLeft', { ctrlKey: true }))).toEqual({ kind: 'partial' });
    expect(shortcutFromPress(press('ShiftRight', { ctrlKey: true, shiftKey: true }))).toEqual({ kind: 'partial' });
  });

  it('refuses what would get in the way of typing or is not on every keyboard', () => {
    expect(shortcutFromPress(press('KeyA'))).toEqual({ kind: 'invalid' });
    expect(shortcutFromPress(press('KeyA', { shiftKey: true }))).toEqual({ kind: 'invalid' });
    expect(shortcutFromPress(press('Semicolon', { ctrlKey: true }))).toEqual({ kind: 'invalid' });
    expect(shortcutFromPress(press('F13', { ctrlKey: true }))).toEqual({ kind: 'invalid' });
  });
});

describe('shortcutKeys', () => {
  it('shows each key as it is printed on the keyboard', () => {
    expect(shortcutKeys('Ctrl+Alt+Shift+KeyT')).toEqual(['Ctrl', 'Alt', 'Shift', 'T']);
    expect(shortcutKeys('Super+Digit4')).toEqual(['Windows', '4']);
    expect(shortcutKeys('Ctrl+Space')).toEqual(['Ctrl', 'Espacio']);
  });
});
