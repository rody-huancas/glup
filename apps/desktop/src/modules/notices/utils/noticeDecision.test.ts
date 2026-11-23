import { describe, expect, it } from 'vitest';
import { afterSystem, decideNotice } from '@/modules/notices/utils/noticeDecision';

describe('decideNotice', () => {
  it('with the panel open and the person there: only the toast', () => {
    expect(decideNotice({ panelOpen: true, attentive: true, durationMs: 60_000 })).toEqual({ toast: 'now', system: false });
  });

  it('a very short task with the panel open never makes a Windows notification', () => {
    expect(decideNotice({ panelOpen: true, attentive: false, durationMs: 1200 })).toEqual({ toast: 'now', system: false });
  });

  it('with the island collapsed or hidden: a Windows notification and no toast', () => {
    expect(decideNotice({ panelOpen: false, attentive: false, durationMs: 800 })).toEqual({ toast: 'none', system: true });
    expect(decideNotice({ panelOpen: false, attentive: false, durationMs: 90_000 })).toEqual({ toast: 'none', system: true });
  });

  it('with another app in front for a long task: a Windows notification', () => {
    expect(decideNotice({ panelOpen: true, attentive: false, durationMs: 45_000 })).toEqual({ toast: 'none', system: true });
  });
});

describe('afterSystem', () => {
  const system = { toast: 'none' as const, system: true };

  it('keeps it as it is when the notification showed', () => {
    expect(afterSystem({ decision: system, shown: true, panelOpen: false })).toEqual(system);
  });

  it('falls back to the toast when notifications are off', () => {
    expect(afterSystem({ decision: system, shown: false, panelOpen: false })).toEqual({ toast: 'on-open', system: false });
    expect(afterSystem({ decision: system, shown: false, panelOpen: true })).toEqual({ toast: 'now', system: false });
  });

  it('does not touch a toast-only decision', () => {
    const toast = { toast: 'now' as const, system: false };
    expect(afterSystem({ decision: toast, shown: false, panelOpen: true })).toBe(toast);
  });
});
