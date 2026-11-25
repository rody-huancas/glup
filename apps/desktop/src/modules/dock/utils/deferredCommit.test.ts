import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createDeferredCommit } from '@/modules/dock/utils/deferredCommit';

describe('a position applied only when released', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  const setup = () => {
    const commit   = vi.fn();
    const onChange = vi.fn();
    return { commit, onChange, deferred: createDeferredCommit<number>({ delay: 400, commit, onChange }) };
  };

  it('shows every step but applies nothing while it moves', () => {
    const { commit, onChange, deferred } = setup();
    deferred.hold(10);
    vi.advanceTimersByTime(300);
    deferred.hold(20);
    vi.advanceTimersByTime(300);
    deferred.hold(35);

    expect(commit).not.toHaveBeenCalled();
    expect(onChange).toHaveBeenLastCalledWith(35);
    expect(deferred.waiting()).toBe(true);
  });

  it('applies the last one once, when released', () => {
    const { commit, onChange, deferred } = setup();
    deferred.hold(10);
    deferred.hold(35);
    deferred.release();
    vi.advanceTimersByTime(1000);
    deferred.release();

    expect(commit).toHaveBeenCalledTimes(1);
    expect(commit).toHaveBeenCalledWith(35);
    expect(onChange).toHaveBeenLastCalledWith(null);
  });

  it('applies it after a short pause with no more steps (the arrows)', () => {
    const { commit, deferred } = setup();
    deferred.hold(52);
    vi.advanceTimersByTime(399);
    expect(commit).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(commit).toHaveBeenCalledWith(52);
    expect(commit).toHaveBeenCalledTimes(1);
  });

  it('never applies while pressed, however long the pause, and once on release', () => {
    const { commit, deferred } = setup();
    deferred.press();
    deferred.hold(10);
    vi.advanceTimersByTime(5000);
    deferred.hold(35);
    vi.advanceTimersByTime(5000);

    expect(commit).not.toHaveBeenCalled();
    expect(deferred.pressed()).toBe(true);

    deferred.release();
    vi.advanceTimersByTime(5000);
    expect(commit).toHaveBeenCalledTimes(1);
    expect(commit).toHaveBeenCalledWith(35);
    expect(deferred.pressed()).toBe(false);
  });

  it('releasing a press with no change applies nothing', () => {
    const { commit, deferred } = setup();
    deferred.press();
    deferred.release();
    expect(commit).not.toHaveBeenCalled();
  });

  it('drops it when cancelled', () => {
    const { commit, deferred } = setup();
    deferred.hold(52);
    deferred.cancel();
    vi.advanceTimersByTime(1000);
    expect(commit).not.toHaveBeenCalled();
    expect(deferred.waiting()).toBe(false);
  });
});
