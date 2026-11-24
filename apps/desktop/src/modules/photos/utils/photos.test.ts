import { describe, expect, it } from 'vitest';
import type { FileInfo } from '@/modules/actions/interfaces/fileInfo';
import { allHeic, isHeic, needsPhotoTool, needsRustPreview } from '@/modules/photos/utils/photos';

const file = (path: string): FileInfo => ({ path, name: path, extension: '', size: 1, kind: 'image', pages: null, protected: false, duration: null, width: null, height: null });

describe('photos', () => {
  it('knows the iPhone photos by their extension', () => {
    expect(isHeic('C:\Fotos\IMG_0001.HEIC')).toBe(true);
    expect(isHeic('C:/Fotos/foto.heif')).toBe(true);
    expect(isHeic('C:/Fotos/foto.jpg')).toBe(false);
    expect(isHeic('C:/Fotos.heic/foto')).toBe(false);
    expect(needsRustPreview('C:/a/foto.avif')).toBe(true);
    expect(needsRustPreview('C:/a/foto.webp')).toBe(false);
  });

  it('offers "A JPG" only when every file is a HEIC', () => {
    expect(allHeic([file('a.heic'), file('b.HEIF')])).toBe(true);
    expect(allHeic([file('a.heic'), file('b.jpg')])).toBe(false);
    expect(allHeic([])).toBe(false);
  });

  it('asks to learn only when Windows cannot open them and FFmpeg is not here', () => {
    const heic = [file('a.heic')];
    const avif = [file('a.avif')];

    expect(needsPhotoTool(heic, { heic: false, avif: true, ffmpeg: false })).toBe(true);
    expect(needsPhotoTool(heic, { heic: true, avif: false, ffmpeg: false })).toBe(false);
    expect(needsPhotoTool(avif, { heic: true, avif: false, ffmpeg: false })).toBe(true);
    expect(needsPhotoTool(heic, { heic: false, avif: false, ffmpeg: true })).toBe(false);
    expect(needsPhotoTool([file('a.png')], { heic: false, avif: false, ffmpeg: false })).toBe(false);
  });
});
