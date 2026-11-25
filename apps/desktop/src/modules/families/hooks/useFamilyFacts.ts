import { useMemo } from 'react';
import { useDiskSpace } from '@/modules/cleanup/hooks/useDiskSpace';
import { useClipboardStatus } from '@/modules/clipboard/hooks/useClipboardStatus';
import { FAMILY_IDS, FAMILY_TEXTS } from '@/modules/families/constants/families';
import type { FamilyId } from '@/modules/families/types/familyId';
import { toolsOf, wholeGigabytes } from '@/modules/families/utils/families';
import { TOOLS } from '@/modules/tools/constants/tools';

// A live line for each family card: how many tools; what the clipboard keeps; the free space of the PC.
export const useFamilyFacts = (): Record<FamilyId, string> => {
  const { status } = useClipboardStatus();
  const { space }  = useDiskSpace(0);

  return useMemo(() => {
    const facts = Object.fromEntries(FAMILY_IDS.map((family) => [family, FAMILY_TEXTS.tools(toolsOf(TOOLS, family).length)])) as Record<FamilyId, string>;
    if (status) facts.clipboard = status.enabled ? FAMILY_TEXTS.saved(status.count) : FAMILY_TEXTS.clipOff;
    if (space) facts.pc = FAMILY_TEXTS.free(wholeGigabytes(space.free));
    return facts;
  }, [status, space]);
};
