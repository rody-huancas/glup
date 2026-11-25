import { FAMILY_STYLES } from '@/modules/families/constants/families';
import { familyOfPage } from '@/modules/families/utils/families';
import { NAV_ITEMS } from '@/modules/main-window/constants/navigation';
import type { PageId } from '@/modules/main-window/types/pageId';
import { UPDATE_TEXTS } from '@/modules/updates/constants/texts';
import { useUpdate } from '@/modules/updates/hooks/useUpdate';
import { NavItem } from '@/shared/components/NavItem';

interface SidebarNavProps {
  page       : PageId;
  onNavigate : (page: PageId) => void;
}

// The active item is filled with color: mint, or the family's color while on a family's screen (which
// lives under Inicio). Ajustes shows a lilac dot while a newer version waits.
export const SidebarNav = ({ page, onNavigate }: SidebarNavProps) => {
  const { available } = useUpdate();
  const family        = familyOfPage(page);
  const current       = family ? 'home' : page;

  return (
    <nav className="flex flex-col gap-1">
      {NAV_ITEMS.map((item) => (
        <NavItem
          key={item.id}
          label={item.label}
          icon={item.icon}
          active={item.id === current}
          activeClassName={family ? FAMILY_STYLES[family].nav : undefined}
          badge={item.id === 'settings' && available !== null}
          badgeLabel={UPDATE_TEXTS.badge}
          badgeTone="lilac"
          onClick={() => onNavigate(item.id)}
        />
      ))}
    </nav>
  );
};
