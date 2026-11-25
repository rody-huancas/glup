import { FamilyGlup } from '@/modules/families/components/FamilyGlup';
import { FAMILIES, FAMILY_STYLES } from '@/modules/families/constants/families';
import { SIDEBAR_TEXTS } from '@/modules/main-window/constants/sidebar';
import type { SearchResult } from '@/modules/main-window/interfaces/searchResult';
import { ToolIcon } from '@/modules/tools/components/ToolIcon';
import { SettingsIcon } from '@/shared/icons/SettingsIcon';
import { ToolsIcon } from '@/shared/icons/ToolsIcon';
import { cx } from '@/shared/utils/classNames';

interface SidebarSearchOptionProps {
  result   : SearchResult;
  active   : boolean;
  onChoose : (result: SearchResult) => void;
  onHover  : () => void;
}

const label = (result: SearchResult): { title: string; hint: string } => {
  if (result.kind === 'tool') return { title: result.tool.title, hint: FAMILIES[result.tool.family].name };
  if (result.kind === 'family') return { title: FAMILIES[result.family].name, hint: SIDEBAR_TEXTS.family };
  if (result.kind === 'setting') return { title: result.setting.title, hint: SIDEBAR_TEXTS.setting };
  return { title: SIDEBAR_TEXTS.allTools, hint: '' };
};

// One result of the search (an option of its listbox): its icon, its name and what it is.
export const SidebarSearchOption = ({ result, active, onChoose, onHover }: SidebarSearchOptionProps) => {
  const { title, hint } = label(result);

  return (
    <li
      id={result.id}
      role="option"
      aria-selected={active}
      onPointerDown={(event) => event.preventDefault()}
      onClick={() => onChoose(result)}
      onPointerEnter={onHover}
      className={cx('flex cursor-pointer items-center gap-2.5 rounded-control px-2 py-1.5', active ? 'bg-raised' : 'hover:bg-raised/60')}
    >
      {result.kind === 'tool' && <ToolIcon icon={result.tool.icon} family={result.tool.family} />}
      {result.kind === 'family' && <FamilyGlup family={result.family} className="size-9" />}
      {result.kind === 'setting' && <span className="flex size-9 shrink-0 items-center justify-center rounded-control bg-bg text-muted"><SettingsIcon /></span>}
      {result.kind === 'all-tools' && <span className="flex size-9 shrink-0 items-center justify-center rounded-control bg-bg text-lilac"><ToolsIcon /></span>}
      <span className="flex min-w-0 flex-col">
        <span className={cx('truncate text-[13px] font-semibold', result.kind === 'family' ? FAMILY_STYLES[result.family].text : 'text-text')}>{title}</span>
        {hint && <span className="truncate text-[11px] text-muted">{hint}</span>}
      </span>
    </li>
  );
};
