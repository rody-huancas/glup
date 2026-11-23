import { describe, expect, it } from 'vitest';
import { screenTextNotice } from '@/modules/screen-text/utils/screenTextNotice';

describe('screenTextNotice', () => {
  it('counts the words copied, with the plural right', () => {
    expect(screenTextNotice({ outcome: 'copied', words: 42, entryId: '7' })).toEqual({ message: 'Copié 42 palabras', tone: 'success', entryId: '7' });
    expect(screenTextNotice({ outcome: 'copied', words: 1, entryId: null })).toEqual({ message: 'Copié 1 palabra', tone: 'success', entryId: null });
  });

  it('says so, with Glup confused, when there was no text or it could not read it', () => {
    expect(screenTextNotice({ outcome: 'empty', words: 0, entryId: null })).toEqual({ message: 'No encontré texto ahí', tone: 'failed' });
    expect(screenTextNotice({ outcome: 'failed', words: 0, entryId: null })).toEqual({ message: 'No pude leer esa zona', tone: 'failed' });
  });
});
