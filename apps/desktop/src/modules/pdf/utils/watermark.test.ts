import { describe, expect, it } from 'vitest';
import { WATERMARK_TEXTS } from '@/modules/pdf/constants/watermark';
import { cleanWatermarkText, watermarkProblem, watermarkText } from '@/modules/pdf/utils/watermark';

describe('watermark text', () => {
  it('uses the quick texts as they are', () => {
    expect(watermarkText({ preset: 'copy', custom: 'algo' })).toBe('COPIA');
    expect(watermarkText({ preset: 'draft', custom: '' })).toBe('BORRADOR');
    expect(watermarkText({ preset: 'confidential', custom: '' })).toBe('CONFIDENCIAL');
  });

  it('cleans a typed one into one line, as Rust draws it', () => {
    expect(watermarkText({ preset: 'custom', custom: '  Solo \n para Ana  ' })).toBe('Solo para Ana');
    expect(cleanWatermarkText('ñ'.repeat(60))).toHaveLength(40);
  });

  it('cannot go on without a text', () => {
    expect(watermarkProblem(watermarkText({ preset: 'custom', custom: '   ' }))).toBe(WATERMARK_TEXTS.empty);
    expect(watermarkProblem('COPIA')).toBeNull();
  });
});
