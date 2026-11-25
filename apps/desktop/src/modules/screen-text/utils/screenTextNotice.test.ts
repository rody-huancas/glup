import { describe, expect, it } from 'vitest';
import type { ReadCode } from '@/modules/qr/interfaces/readCode';
import { screenTextNotice } from '@/modules/screen-text/utils/screenTextNotice';

const qr: ReadCode = { format: 'QR', text: 'https://glup.app', read: { kind: 'link', url: 'https://glup.app', host: 'glup.app', warnings: [] } };

describe('screenTextNotice', () => {
  it('counts the words copied, with the plural right', () => {
    expect(screenTextNotice({ outcome: 'copied', words: 42, entryId: '7', codes: [] })).toEqual({ message: 'Copié 42 palabras', tone: 'success', entryId: '7' });
    expect(screenTextNotice({ outcome: 'copied', words: 1, entryId: null, codes: [] })).toEqual({ message: 'Copié 1 palabra', tone: 'success', entryId: null });
  });

  it('offers the codes of the zone, with or without text', () => {
    expect(screenTextNotice({ outcome: 'codes', words: 0, entryId: null, codes: [qr, qr] })).toEqual({ message: 'Encontré 2 códigos', tone: 'success', page: 'qr-read' });
    expect(screenTextNotice({ outcome: 'copied', words: 3, entryId: '9', codes: [qr] })).toEqual({ message: 'Copié 3 palabras · y hay un QR', tone: 'success', page: 'qr-read' });
  });

  it('says so, with Glup confused, when there was no text or it could not read it', () => {
    expect(screenTextNotice({ outcome: 'empty', words: 0, entryId: null, codes: [] })).toEqual({ message: 'No encontré texto ahí', tone: 'failed' });
    expect(screenTextNotice({ outcome: 'failed', words: 0, entryId: null, codes: [] })).toEqual({ message: 'No pude leer esa zona', tone: 'failed' });
  });
});
