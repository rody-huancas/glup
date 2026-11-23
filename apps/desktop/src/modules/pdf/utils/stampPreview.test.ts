import { describe, expect, it } from 'vitest';
import { numberPreview, watermarkPreview } from '@/modules/pdf/utils/stampPreview';

const page = { width: 125, height: 176 };

describe('stamp preview', () => {
  it('puts the diagonal watermark in the center, along the diagonal', () => {
    const preview = watermarkPreview({ options: { text: 'COPIA', size: 'medium', opacity: 'soft', position: 'diagonal' }, page, unit: 3.3 });
    expect(preview.left).toBe(62.5);
    expect(preview.top).toBe(88);
    expect(preview.angle).toBeCloseTo((Math.atan2(176, 125) * 180) / Math.PI);
    expect(preview.opacity).toBe(0.15);
  });

  it('grows with the size and never gets taller than a third of the page', () => {
    const small = watermarkPreview({ options: { text: 'A', size: 'small', opacity: 'medium', position: 'diagonal' }, page, unit: 3.3 });
    const large = watermarkPreview({ options: { text: 'A', size: 'large', opacity: 'medium', position: 'diagonal' }, page, unit: 3.3 });
    expect(large.fontSize).toBeGreaterThan(small.fontSize);
    expect(watermarkPreview({ options: { text: 'A', size: 'large', opacity: 'medium', position: 'diagonal' }, page, unit: 0.7 }).fontSize).toBeCloseTo(125 / 3);
  });

  it('keeps small texts readable in the corner', () => {
    const corner = watermarkPreview({ options: { text: 'COPIA', size: 'small', opacity: 'strong', position: 'corner' }, page, unit: 3.3 });
    expect(corner.fontSize).toBeGreaterThanOrEqual(7);
    expect(corner.anchor).toBe('bottom-right');
    expect(corner.left).toBeLessThan(page.width);
  });

  it('places page numbers where chosen', () => {
    expect(numberPreview({ position: 'bottom-center', page }).left).toBe(62.5);
    expect(numberPreview({ position: 'bottom-right', page }).top).toBeGreaterThan(page.height / 2);
    expect(numberPreview({ position: 'top-right', page }).top).toBeLessThan(page.height / 2);
  });
});
