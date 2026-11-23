import { describe, expect, it } from 'vitest';
import type { VideoPlanReport } from '@/modules/video/interfaces/videoPlanReport';
import { planEstimate, planWarning } from '@/modules/video/utils/planWarning';

const report = (estimate: number, tooLong: boolean, budget: number | null = 25_000_000): VideoPlanReport => ({
  path : 'C:/videos/paseo.mp4',
  info : { duration: 60, width: 1920, height: 1080, hasAudio: true },
  plan : { width: 1280, height: 720, estimate, tooLong, budget },
});

describe('video plan warning', () => {
  it('says nothing when the size can be reached', () => {
    expect(planWarning([report(23_000_000, false)], 'email')).toBeNull();
  });

  it('says how much a long video will weigh for email', () => {
    expect(planWarning([report(45_000_000, true)], 'email')).toBe('Es muy largo para que pese menos de 25 MB; quedará en unos 42,9 MB.');
  });

  it('uses the size typed for a custom limit', () => {
    expect(planWarning([report(12_000_000, true, 5_000_000)], 'target')).toBe('Es muy largo para que pese menos de 4,8 MB; quedará en unos 11,4 MB.');
  });

  it('counts the long ones among several videos', () => {
    expect(planWarning([report(45_000_000, true), report(10_000_000, false), report(60_000_000, true)], 'email')).toBe(
      '2 de los videos son muy largos para ese peso: quedarán un poco por encima.',
    );
  });

  it('shows the estimate only for one video that fits', () => {
    expect(planEstimate([report(14_000_000, false)])).toBe('Quedará en unos 13,4 MB');
    expect(planEstimate([report(14_000_000, true)])).toBeNull();
    expect(planEstimate([report(1, false), report(2, false)])).toBeNull();
  });
});
