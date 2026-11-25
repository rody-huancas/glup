import { useEffect, useState } from 'react';
import { PREVIEW_DELAY } from '@/modules/scan/constants/scan';
import type { ScanSheet } from '@/modules/scan/interfaces/scanSheet';
import { getScanPreview } from '@/modules/scan/services/scan';
import type { ScanMode } from '@/modules/scan/types/scanMode';
import { sheetIsUsable } from '@/modules/scan/utils/sheets';

interface ScanPreviewParams {
  sheet : ScanSheet | null;
  mode  : ScanMode;
}

// The chosen page as it will come out, asked for a moment after the last change (dragging a corner asks
// nothing until it stops). The last one stays on screen until the next arrives.
export const useScanPreview = ({ sheet, mode }: ScanPreviewParams) => {
  const [url, setUrl]         = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const usable                = sheet !== null && sheetIsUsable(sheet);
  const key                   = sheet && usable ? JSON.stringify([sheet.path, sheet.corners, sheet.rotation, mode]) : null;

  useEffect(() => {
    if (!sheet || !key) return;
    let active  = true;
    const page  = { path: sheet.path, corners: sheet.corners, rotation: sheet.rotation };
    const timer = window.setTimeout(() => {
      setLoading(true);
      void getScanPreview({ page, mode })
        .then((next) => {
          if (!active) return URL.revokeObjectURL(next);
          setUrl((previous) => {
            if (previous) URL.revokeObjectURL(previous);
            return next;
          });
        })
        .catch(() => undefined)
        .finally(() => active && setLoading(false));
    }, PREVIEW_DELAY);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  // The key holds everything the preview depends on (the sheet object changes on every render).
  }, [key]);

  useEffect(() => () => {
    setUrl((previous) => {
      if (previous) URL.revokeObjectURL(previous);
      return null;
    });
  }, []);

  return { url: usable ? url : null, loading };
};
