import { describe, expect, it } from 'vitest';
import type { HistoryEntry } from '@/modules/history/interfaces/historyEntry';
import { toolOfEntry, topTools } from '@/modules/home/utils/quickTools';
import { TOOLS } from '@/modules/tools/constants/tools';

const entry = (action: HistoryEntry['action'], type: HistoryEntry['type'], id: string): HistoryEntry => ({
  id, name: 'a', path: 'C:/a', type, action, detail: '', date: '2026-11-24T10:00:00-05:00',
});

describe('the tools of the Historial', () => {
  it('knows which tool made an entry, by its file type when they share an action', () => {
    expect(toolOfEntry(entry('compress', 'image', '1'), TOOLS)?.id).toBe('compress-image');
    expect(toolOfEntry(entry('compress', 'video', '2'), TOOLS)?.id).toBe('compress-video');
    expect(toolOfEntry(entry('compress', 'pdf', '3'), TOOLS)?.id).toBe('compress-pdf');
    expect(toolOfEntry(entry('cleanup', 'cleanup', '4'), TOOLS)?.id).toBe('cleanup');
    expect(toolOfEntry(entry('folder-sort', 'folder-sort', '5'), TOOLS)?.id).toBe('folder-sort');
  });

  it('puts the most used first, the most recent on a tie, up to the limit', () => {
    const entries = [
      entry('merge', 'pdf', 'a'),
      entry('transcribe', 'audio', 'b'),
      entry('transcribe', 'audio', 'c'),
      entry('compress', 'image', 'd'),
      entry('merge', 'pdf', 'e'),
      entry('transcribe', 'audio', 'f'),
      entry('zip', 'zip', 'g'),
    ];
    expect(topTools({ entries, tools: TOOLS, limit: 3 }).map((tool) => tool.id)).toEqual(['transcribe', 'merge-pdf', 'compress-image']);
    expect(topTools({ entries: [], tools: TOOLS, limit: 4 })).toEqual([]);
  });
});
