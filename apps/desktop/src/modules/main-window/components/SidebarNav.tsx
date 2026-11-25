import { FAMILY_STYLES } from '@/modules/families/constants/families';
import { familyOfPage } from '@/modules/families/utils/families';
import { SIDEBAR_TEXTS } from '@/modules/main-window/constants/sidebar';
import { NAV_ITEMS, OWN_ITEMS } from '@/modules/main-window/constants/navigation';
import { useHistoryBadge } from '@/modules/main-window/hooks/useHistoryBadge';
import type { PageId } from '@/modules/main-window/types/pageId';
import { countLabel } from '@/modules/main-window/utils/historyCount';
import { NavItem } from '@/shared/components/NavItem';

interface SidebarNavProps {
  page       : PageId;
  onNavigate : (page: PageId) => void;
}

// Inicio, Habilidades and Historial, the active one filled with mint (Habilidades with the family's color
// while on a family); Historial with how many entries came since it was last opened.
export const SidebarNav = ({ page, onNavigate }: SidebarNavProps) => {
  const fresh  = useHistoryBadge();
  const active = OWN_ITEMS.includes(page) ? page : 'tools';
  const family = familyOfPage(page);

  return (
    <nav className="flex flex-col gap-0.5">
      {NAV_ITEMS.map((item) => (
        <NavItem
          key={item.id}
          label={item.label}
          icon={item.icon}
          active={item.id === active}
          activeClassName={item.id === 'tools' && family ? FAMILY_STYLES[family].nav : undefined}
          count={item.id === 'history' && fresh > 0 && page !== 'history' ? countLabel(fresh) : undefined}
          countLabel={SIDEBAR_TEXTS.newEntries(fresh)}
          onClick={() => onNavigate(item.id)}
        />
      ))}
    </nav>
  );
};
