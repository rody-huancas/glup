import { describe, expect, it } from 'vitest';
import type { CodeSource } from '@/modules/qr/interfaces/readCode';
import { allCodes, contactFileName, emptyContent, isFilled, masked } from '@/modules/qr/utils/qr';

describe('the forms of Crear un QR', () => {
  it('start empty and know when there is enough', () => {
    expect(emptyContent('whatsapp')).toEqual({ kind: 'whatsapp', country: '51', number: '', message: '' });
    expect(isFilled(emptyContent('wifi'))).toBe(false);
    expect(isFilled({ kind: 'wifi', ssid: 'Casa', password: '', security: 'open', hidden: false })).toBe(true);
    expect(isFilled({ kind: 'contact', name: '', phone: ' ', email: 'a@b.pe', company: '' })).toBe(true);
    expect(isFilled({ kind: 'text', text: '   ' })).toBe(false);
  });
});

describe('what Leer un QR shows', () => {
  it('hides the password and lists every code of every source', () => {
    expect(masked('abc')).toBe('••••••••');
    expect(masked('x'.repeat(30))).toHaveLength(16);
    const sources: CodeSource[] = [
      { id: 'a', label: 'foto.png', error: null, codes: [{ format: 'QR', text: 'uno', read: { kind: 'text', text: 'uno' } }, { format: 'EAN-13', text: '775', read: { kind: 'text', text: '775' } }] },
      { id: 'b', label: 'pantalla', error: null, codes: [] },
    ];
    expect(allCodes(sources).map((item) => item.key)).toEqual(['a-0', 'a-1']);
    expect(contactFileName('Ana: "Pérez"', 'contacto')).toBe('Ana Pérez.vcf');
    expect(contactFileName('  ', 'contacto')).toBe('contacto.vcf');
  });
});
