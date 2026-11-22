import { CREATE_TEXTS } from '@/modules/sign/constants/sign';
import type { CreateTab } from '@/modules/sign/types/createTab';
import { cx } from '@/shared/utils/classNames';

interface CreateTabsProps {
  tab      : CreateTab;
  onChange : (tab: CreateTab) => void;
}

const TABS: CreateTab[] = ['draw', 'type', 'upload'];

export const CreateTabs = ({ tab, onChange }: CreateTabsProps) => (
  <div role="tablist" className="grid grid-cols-3 gap-1 rounded-control bg-raised p-1">
    {TABS.map((option) => (
      <button
        key={option}
        type="button"
        role="tab"
        aria-selected={option === tab}
        onClick={() => onChange(option)}
        className={cx(
          'h-8 cursor-pointer rounded-[9px] text-[12px] font-semibold transition-colors',
          option === tab ? 'bg-surface text-text shadow' : 'text-muted hover:text-text',
        )}
      >
        {CREATE_TEXTS.tabs[option]}
      </button>
    ))}
  </div>
);
