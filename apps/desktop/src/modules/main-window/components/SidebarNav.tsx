import { useCleanup } from '@/modules/cleanup/hooks/useCleanup';
import { NAV_ITEMS, NAV_TEXTS } from '@/modules/main-window/constants/navigation';
import type { PageId } from '@/modules/main-window/types/pageId';
import { NavItem } from '@/shared/components/NavItem';

interface SidebarNavProps {
  page       : PageId;
  onNavigate : (page: PageId) => void;
}

// Limpieza shows a mint dot when a scan finished while the person was elsewhere.
export const SidebarNav = ({ page, onNavigate }: SidebarNavProps) => {
  const { unseen } = useCleanup();

  return (
    <nav className="flex flex-col gap-1">
      {NAV_ITEMS.map((item) => (
        <NavItem
          key={item.id}
          label={item.label}
          icon={item.icon}
          active={item.id === page}
          badge={item.id === 'cleanup' && unseen && page !== 'cleanup'}
          badgeLabel={NAV_TEXTS.newResult}
          onClick={() => onNavigate(item.id)}
        />
      ))}
    </nav>
  );
};
