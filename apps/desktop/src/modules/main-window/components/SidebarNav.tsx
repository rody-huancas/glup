import { useCleanup } from '@/modules/cleanup/hooks/useCleanup';
import { NAV_ITEMS, NAV_TEXTS } from '@/modules/main-window/constants/navigation';
import type { PageId } from '@/modules/main-window/types/pageId';
import { UPDATE_TEXTS } from '@/modules/updates/constants/texts';
import { useUpdate } from '@/modules/updates/hooks/useUpdate';
import { NavItem } from '@/shared/components/NavItem';

interface SidebarNavProps {
  page       : PageId;
  onNavigate : (page: PageId) => void;
}

// Limpieza shows a mint dot when a scan finished while the person was elsewhere; Ajustes a lilac one
// while a newer version waits.
export const SidebarNav = ({ page, onNavigate }: SidebarNavProps) => {
  const { unseen }    = useCleanup();
  const { available } = useUpdate();

  return (
    <nav className="flex flex-col gap-1">
      {NAV_ITEMS.map((item) => (
        <NavItem
          key={item.id}
          label={item.label}
          icon={item.icon}
          active={item.id === page}
          badge={(item.id === 'cleanup' && unseen && page !== 'cleanup') || (item.id === 'settings' && available !== null)}
          badgeLabel={item.id === 'settings' ? UPDATE_TEXTS.badge : NAV_TEXTS.newResult}
          badgeTone={item.id === 'settings' ? 'lilac' : 'mint'}
          onClick={() => onNavigate(item.id)}
        />
      ))}
    </nav>
  );
};
