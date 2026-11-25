import { describe, expect, it } from 'vitest';
import { TOOL_CHOICES, TOOL_GROUPS } from '@/modules/auto-folders/constants/choices';
import { RULE_TEMPLATES } from '@/modules/auto-folders/constants/templates';
import type { AutoRule } from '@/modules/auto-folders/interfaces/autoRule';
import type { AutoToolId } from '@/modules/auto-folders/types/autoToolId';
import { blankDraft, choiceOf, draftFromRule, draftFromTemplate, draftProblem, extensionsOf, folderLabel, inputFromDraft, optionsFor, sentenceOf, withTool } from '@/modules/auto-folders/utils/draft';

const downloads = 'C:\\Users\\Rody\\Downloads';

describe('a rule as a sentence', () => {
  it('reads like a person would say it', () => {
    const jpg = draftFromTemplate({ template: RULE_TEMPLATES[1], folder: downloads });
    expect(sentenceOf(jpg, 'Descargas')).toBe('Cuando llegue una foto de iPhone a Descargas, pasarlo a JPG calidad normal y dejar el original');

    const videos = draftFromTemplate({ template: RULE_TEMPLATES[2], folder: downloads });
    expect(sentenceOf({ ...videos, original: 'trash' }, 'Descargas')).toBe('Cuando llegue un video de más de 100 MB a Descargas, reducir su peso para WhatsApp y mover el original a la papelera');

    // Sorting moves the file itself: nothing to say about the original.
    const sort = draftFromTemplate({ template: RULE_TEMPLATES[0], folder: downloads });
    expect(sentenceOf(sort, 'Descargas')).toBe('Cuando llegue cualquier archivo a Descargas, ordenarlo por tipo');

    const custom = { ...blankDraft(downloads), group: 'custom' as const, extensions: '.PSD, dwg' };
    expect(sentenceOf(custom, 'Diseños')).toBe('Cuando llegue un archivo .psd o .dwg a Diseños, ordenarlo por tipo');
  });
});

describe('the options a rule keeps', () => {
  it('are the ones the panel sends, and come back to edit it', () => {
    const tools = Object.keys(TOOL_GROUPS) as AutoToolId[];
    for (const tool of tools) {
      for (const option of TOOL_CHOICES[tool]?.options ?? [{ value: '', label: '' }]) {
        const choice = option.value || null;
        expect(choiceOf(tool, optionsFor(tool, choice))).toBe(choice);
      }
    }
    expect(optionsFor('compress-video', 'email')).toEqual({ video: { goal: 'email' } });
    expect(optionsFor('compress-pdf', 'maximum')).toEqual({ reduce: { level: 'maximum' } });
    expect(optionsFor('compress-image', null)).toEqual({});
    // Something unknown in a saved rule: the default.
    expect(choiceOf('convert-image', { format: 'bmp' })).toBe('webp');
  });

  it('keep a type of file the action can work on', () => {
    const draft = { ...blankDraft(downloads), group: 'pdf' as const };
    expect(withTool(draft, 'iphone-to-jpg').group).toBe('iphone');
    expect(withTool(draft, 'compress-pdf').group).toBe('pdf');
    expect(withTool({ ...draft, group: 'videos' }, 'transcribe').group).toBe('videos');
    expect(withTool(draft, 'convert-image').choice).toBe('webp');
  });

  it('go to Rust as it expects them', () => {
    const draft = { ...blankDraft(downloads), group: 'custom' as const, extensions: 'psd; .TIFF', minMb: '2,5', tool: 'compress-image' as const, choice: null, original: 'trash' as const, saveMode: 'custom' as const, saveFolder: 'D:\\Livianas' };
    const input = inputFromDraft(draft, 'Descargas');
    expect(input.filter).toEqual({ group: 'custom', extensions: ['psd', 'tiff'], minMb: 2.5 });
    expect(input.destination).toEqual({ mode: 'custom', folder: 'D:\\Livianas' });
    expect(input.original).toBe('trash');
    expect(input.name).toContain('Cuando llegue');

    // Sorting never sends an original to the bin nor saves elsewhere.
    const sort = inputFromDraft({ ...draft, tool: 'folder-sort', choice: 'date' }, 'Descargas');
    expect([sort.original, sort.destination.mode, sort.action.options]).toEqual(['keep', 'same', { mode: 'date' }]);
  });

  it('say what is missing before saving', () => {
    expect(draftProblem(blankDraft(''))).toBe('Elige una carpeta');
    expect(draftProblem({ ...blankDraft(downloads), group: 'custom', extensions: ' , ' })).toBe('Escribe al menos una extensión');
    expect(draftProblem({ ...blankDraft(downloads), minMb: 'mucho' })).toBe('Escribe el peso en MB, con un número');
    expect(draftProblem({ ...blankDraft(downloads), minMb: '50' })).toBeNull();
    expect(extensionsOf('.psd,DWG  ai')).toEqual(['psd', 'dwg', 'ai']);
  });

  it('come back whole from a saved rule', () => {
    const saved: AutoRule = {
      ...inputFromDraft(draftFromTemplate({ template: RULE_TEMPLATES[2], folder: downloads }), 'Descargas'),
      id: '1', processed: 3, lastRun: null, seenUntil: 0, needs: null, held: [], folderName: 'Descargas', waiting: 0, asking: null,
    };
    const draft = draftFromRule(saved);
    expect([draft.tool, draft.choice, draft.minMb, draft.saveMode]).toEqual(['compress-video', 'whatsapp', '100', 'glup']);
    expect(folderLabel(downloads)).toBe('Downloads');
  });
});
