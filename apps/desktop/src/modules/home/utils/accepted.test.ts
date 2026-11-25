import { describe, expect, it } from 'vitest';
import { ACCEPTED_LABELS } from '@/modules/home/constants/home';
import { acceptedKinds, joinWords } from '@/modules/home/utils/accepted';
import { TOOLS } from '@/modules/tools/constants/tools';
import type { Tool } from '@/modules/tools/types/tool';

const tool = (fileType: 'pdf' | 'image' | 'audio' | 'video' | 'any' | 'files'): Tool => ({
  id: fileType, kind: 'action', family: 'pdf', icon: 'text', actionId: 'zip', fileType, multiple: true, title: '', description: '',
});

describe('what the drop zone accepts', () => {
  it('comes from tools.json', () => {
    expect(joinWords(acceptedKinds({ tools: TOOLS, labels: ACCEPTED_LABELS }))).toBe('PDF, imágenes, audio y video');
  });

  it('lists only the kinds some tool takes, in a fixed order', () => {
    expect(acceptedKinds({ tools: [tool('video'), tool('any'), tool('pdf'), tool('files')], labels: ACCEPTED_LABELS })).toEqual(['PDF', 'video']);
  });

  it('joins the words in Spanish', () => {
    expect(joinWords([])).toBe('');
    expect(joinWords(['PDF'])).toBe('PDF');
    expect(joinWords(['PDF', 'imágenes'])).toBe('PDF y imágenes');
  });
});
