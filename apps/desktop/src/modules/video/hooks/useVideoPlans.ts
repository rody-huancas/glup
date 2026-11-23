import { useEffect, useState } from 'react';
import type { VideoOptions } from '@/modules/video/interfaces/videoOptions';
import type { VideoPlanReport } from '@/modules/video/interfaces/videoPlanReport';
import { planVideos } from '@/modules/video/services/videoTool';

interface UseVideoPlansParams {
  paths   : string[];
  options : VideoOptions;
  // Only the options with a size need the warning; the others do not ask Rust.
  enabled : boolean;
}

// How the videos would come out with these options, asked again when they change (null while asking).
export const useVideoPlans = ({ paths, options, enabled }: UseVideoPlansParams): VideoPlanReport[] | null => {
  const [reports, setReports] = useState<VideoPlanReport[] | null>(null);
  const { goal, targetBytes } = options;
  const key                   = paths.join('|');

  useEffect(() => {
    if (!enabled) return;

    let active = true;
    setReports(null);
    void planVideos({ paths: key.split('|'), options: { goal, targetBytes } })
      .then((next) => active && setReports(next))
      .catch(() => active && setReports([]));

    return () => {
      active = false;
    };
  }, [enabled, key, goal, targetBytes]);

  return enabled ? reports : null;
};
