import { describe, expect, it } from 'vitest';
import { shortcutConflict } from '@/modules/shortcuts/utils/shortcutConflict';

describe('shortcutConflict', () => {
  it('names what a well-known shortcut does', () => {
    expect(shortcutConflict('Ctrl+KeyC')).toBe('Ctrl+C ya es un atajo conocido: sirve para copiar. Si lo guardas, puede dejar de funcionar en otros programas.');
    expect(shortcutConflict('Alt+F4')).toContain('cerrar la ventana');
    expect(shortcutConflict('Ctrl+Shift+KeyT')).toContain('reabrir la pestaña');
    expect(shortcutConflict('Ctrl+Digit3')).toContain('cambiar de pestaña');
  });

  it('warns about the Windows key and about AltGr', () => {
    expect(shortcutConflict('Shift+Super+KeyS')).toBe('Shift+Windows+S puede ser un atajo de Windows: muchas combinaciones con la tecla Windows ya tienen uso. Si lo guardas, puede dejar de funcionar.');
    expect(shortcutConflict('Ctrl+Alt+KeyQ')).toContain('AltGr');
    expect(shortcutConflict('Ctrl+Alt+Digit2')).toContain('AltGr');
  });

  it('warns about Alt with a letter, which opens menus', () => {
    expect(shortcutConflict('Alt+KeyF')).toContain('menús');
  });

  it('lets a free one through', () => {
    expect(shortcutConflict('Ctrl+Alt+Shift+KeyT')).toBeNull();
    expect(shortcutConflict('Ctrl+Shift+Digit9')).toBeNull();
    expect(shortcutConflict('Alt+F9')).toBeNull();
  });
});
