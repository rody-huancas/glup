import { useCallback } from 'react';
import { FamilyDropZone } from '@/modules/families/components/FamilyDropZone';
import { FamilyHeader } from '@/modules/families/components/FamilyHeader';
import { FAMILY_TEXTS } from '@/modules/families/constants/families';
import { familyOfPage, toolsOf } from '@/modules/families/utils/families';
import type { PageProps } from '@/modules/main-window/interfaces/pageProps';
import { requestShortcutFocus } from '@/modules/shortcuts/store/shortcutFocus';
import type { ShortcutTarget } from '@/modules/shortcuts/types/shortcutTarget';
import { ToolGrid } from '@/modules/tools/components/ToolGrid';
import { TOOLS } from '@/modules/tools/constants/tools';
import { useToolRunner } from '@/modules/tools/hooks/useToolRunner';
import { SectionLabel } from '@/shared/components/SectionLabel';

// One family: its color and Glup, the drop zone for its files, and its tools.
export const FamilyPage = ({ page, files, onNavigate }: PageProps) => {
  const family  = familyOfPage(page) ?? 'images';
  const runTool = useToolRunner({ runTool: files.runTool, onNavigate });

  const changeShortcut = useCallback((target: ShortcutTarget) => {
    requestShortcutFocus(target);
    onNavigate('settings');
  }, [onNavigate]);

  return (
    <div className="flex h-full flex-col gap-4">
      <FamilyHeader family={family} />
      <FamilyDropZone family={family} files={files} />
      <section className="flex flex-col gap-3">
        <SectionLabel>{FAMILY_TEXTS.toolsTitle}</SectionLabel>
        <ToolGrid tools={toolsOf(TOOLS, family)} onRun={runTool} onChangeShortcut={changeShortcut} />
      </section>
    </div>
  );
};
