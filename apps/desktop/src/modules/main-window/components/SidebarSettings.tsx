import { SIDEBAR_TEXTS } from '@/modules/main-window/constants/sidebar';
import { SETTINGS_ITEM } from '@/modules/main-window/constants/navigation';
import type { PageId } from '@/modules/main-window/types/pageId';
import { UPDATE_TEXTS } from '@/modules/updates/constants/texts';
import { useUpdate } from '@/modules/updates/hooks/useUpdate';
import { NavItem } from '@/shared/components/NavItem';
import { LockIcon } from '@/shared/icons/LockIcon';

interface SidebarSettingsProps {
  page       : PageId;
  onNavigate : (page: PageId) => void;
}

// The foot of the bar: Ajustes as one more item (a lilac dot while a newer version waits) and, under it,
// «Todo en tu PC», small and quiet.
export const SidebarSettings = ({ page, onNavigate }: SidebarSettingsProps) => {
  const { available } = useUpdate();

  return (
    <div className="mt-2 flex shrink-0 flex-col gap-1.5">
      <NavItem
        label={SETTINGS_ITEM.label}
        icon={SETTINGS_ITEM.icon}
        active={page === 'settings'}
        onClick={() => onNavigate('settings')}
        badge={available !== null}
        badgeLabel={UPDATE_TEXTS.badge}
        badgeTone="lilac"
      />
      <span className="flex items-center gap-1.5 px-3 text-[11px] text-muted/80">
        <LockIcon className="size-3.5" />
        {SIDEBAR_TEXTS.private}
      </span>
    </div>
  );
};
