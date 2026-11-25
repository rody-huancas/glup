import { describe, expect, it } from 'vitest';
import { DIALOG_FILTERS } from '@/modules/actions/constants/fileDialog';
import { VIDEO_EXTENSIONS } from '@/modules/actions/constants/video';
import type { FileInfo } from '@/modules/actions/interfaces/fileInfo';
import type { FileType } from '@/modules/actions/types/fileType';
import { createSelection } from '@/modules/actions/utils/selection';
import { TOOLS } from '@/modules/tools/constants/tools';

const file = (name: string, kind: FileType): FileInfo => ({
  path: `C:/v/${name}`, name, extension: name.split('.').pop() ?? '', size: 1000, kind, pages: null, protected: false, duration: 12, width: null, height: null,
});

const actionsOf = (info: FileInfo): string[] => createSelection({ paths: [info.path], files: [info] })?.actions.map((action) => action.id) ?? [];

describe('Recortar', () => {
  const tool = TOOLS.find((entry) => entry.id === 'trim-media');

  it('is offered for a video and for an audio', () => {
    expect(actionsOf(file('whatsapp.mp4', 'video'))).toContain('trim');
    expect(actionsOf(file('cancion.mp3', 'audio'))).toContain('trim');
    expect(actionsOf(file('viejo.wmv', 'video'))).toContain('trim');
  });

  it('opens «Elegir archivos» on videos and audios together', () => {
    expect(tool?.kind).toBe('action');
    if (tool?.kind !== 'action') return;
    const [first] = DIALOG_FILTERS[tool.fileType];
    expect(first.extensions).toEqual(expect.arrayContaining([...VIDEO_EXTENSIONS, 'mp3', 'wav', 'm4a']));
    expect(VIDEO_EXTENSIONS).toEqual(expect.arrayContaining(['mp4', 'mov', 'mkv', 'avi', 'webm', 'm4v', '3gp', 'wmv']));
    expect(tool.menuTypes).toEqual(['audio', 'video']);
  });
});
