import { describe, expect, it } from 'vitest';
import { downloadFraction, nextLearnPhase } from '@/modules/background/utils/learnStep';

describe('nextLearnPhase', () => {
  it('asks first when the model is missing and goes straight to the choice when it is there', () => {
    expect(nextLearnPhase('choosing', 'missing')).toBe('learn-model');
    expect(nextLearnPhase('choosing', 'installed')).toBe('background');
  });

  it('downloads, goes back to the question when stopped and to the choice when ready', () => {
    expect(nextLearnPhase('learn-model', 'started')).toBe('learning-model');
    expect(nextLearnPhase('learning-model', 'stopped')).toBe('learn-model');
    expect(nextLearnPhase('learning-model', 'ready')).toBe('background');
  });

  it('goes to the step of the action that needed it (videos)', () => {
    expect(nextLearnPhase('choosing', 'installed', 'video')).toBe('video');
    expect(nextLearnPhase('learning-model', 'ready', 'video')).toBe('video');
    expect(nextLearnPhase('choosing', 'missing', 'video')).toBe('learn-model');
  });

  it('ignores a late event once the step was left', () => {
    expect(nextLearnPhase('choosing', 'ready')).toBe('choosing');
    expect(nextLearnPhase('formats', 'stopped')).toBe('formats');
    expect(nextLearnPhase('choosing', 'started')).toBe('choosing');
  });
});

describe('downloadFraction', () => {
  it('goes from 0 to 1 by bytes and is unknown without a size', () => {
    expect(downloadFraction(0, 100)).toBe(0);
    expect(downloadFraction(25, 100)).toBe(0.25);
    expect(downloadFraction(120, 100)).toBe(1);
    expect(downloadFraction(10, 0)).toBeNull();
  });
});
