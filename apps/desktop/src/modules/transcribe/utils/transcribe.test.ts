import { describe, expect, it } from 'vitest';
import type { FileInfo } from '@/modules/actions/interfaces/fileInfo';
import { durationLabel, estimateText, toOptions, totalSeconds, toTranscribeResult } from '@/modules/transcribe/utils/transcribe';

const file = (duration: number | null): FileInfo => ({
  path: 'C:/a/nota.m4a', name: 'nota.m4a', extension: 'm4a', size: 1, kind: 'audio', pages: null, protected: false, duration, width: null, height: null,
});
const destination = { mode: 'same' as const, folder: null };

describe('transcribe step', () => {
  it('adds up the length of every file, or says it is unknown', () => {
    expect(totalSeconds([file(60), file(140)])).toBe(200);
    expect(totalSeconds([file(60), file(null)])).toBeNull();
  });

  it('tells the wait in minutes', () => {
    expect(estimateText(40)).toBe('Esto tomará menos de un minuto.');
    expect(estimateText(70)).toBe('Esto tomará cerca de un minuto.');
    expect(estimateText(125)).toBe('Esto tomará unos 2 minutos.');
  });

  it('sends no language to detect it, and the one picked under Otro', () => {
    expect(toOptions({ level: 'fast', language: 'auto', other: 'fr' })).toEqual({ level: 'fast', language: null });
    expect(toOptions({ level: 'precise', language: 'es', other: 'fr' })).toEqual({ level: 'precise', language: 'es' });
    expect(toOptions({ level: 'fast', language: 'other', other: 'qu' })).toEqual({ level: 'fast', language: 'qu' });
  });

  it('says how long the audio was', () => {
    expect(durationLabel(45)).toBe('45 s');
    expect(durationLabel(200)).toBe('3 min 20 s');
    expect(durationLabel(3900)).toBe('1 h 05 min');
  });
});

describe('transcribe result', () => {
  it('carries the text and the subtitles', () => {
    const result = toTranscribeResult({ report: { text: 'Hola.', subtitles: '1\n…', seconds: 200, cancelled: false, entryId: 'e' }, paths: ['C:/a/nota.m4a'], destination });
    expect(result.message).toBe('Audio pasado a texto · 3 min 20 s');
    expect(result.text?.subtitles).toBe('1\n…');
  });

  it('nobody spoke: Glup confused', () => {
    const result = toTranscribeResult({ report: { text: ' ', subtitles: '', seconds: 30, cancelled: false, entryId: null }, paths: [], destination });
    expect(result.tone).toBe('failed');
    expect(result.message).toBe('No escuché a nadie hablar en esto');
  });
});
