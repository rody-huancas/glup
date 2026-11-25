import { FamilyGlup } from '@/modules/families/components/FamilyGlup';
import { FAMILIES, FAMILY_STYLES } from '@/modules/families/constants/families';
import type { ShortcutTarget } from '@/modules/shortcuts/types/shortcutTarget';
import { ToolGrid } from '@/modules/tools/components/ToolGrid';
import type { ToolGroup } from '@/modules/tools/interfaces/toolGroup';
import type { Tool } from '@/modules/tools/types/tool';
import { cx } from '@/shared/utils/classNames';

interface ToolGroupSectionProps {
  group            : ToolGroup;
  onRun            : (tool: Tool) => void;
  onChangeShortcut : (target: ShortcutTarget) => void;
}

// One family of the search results: its small Glup and its name in its color, then its tools.
export const ToolGroupSection = ({ group, onRun, onChangeShortcut }: ToolGroupSectionProps) => (
  <section className="flex flex-col gap-3">
    <h2 className="flex items-center gap-2">
      <FamilyGlup family={group.family} className="size-7" />
      <span className={cx('text-[13px] font-bold', FAMILY_STYLES[group.family].text)}>{FAMILIES[group.family].name}</span>
    </h2>
    <ToolGrid tools={group.tools} onRun={onRun} onChangeShortcut={onChangeShortcut} />
  </section>
);
