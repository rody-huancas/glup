import { NAV_ITEMS } from '@/modules/main-window/constants/navigation';
import type { PageId } from '@/modules/main-window/types/pageId';
import { NavItem } from '@/shared/components/NavItem';

interface SidebarNavProps {
  page       : PageId;
  onNavigate : (page: PageId) => void;
}

export const SidebarNav = ({ page, onNavigate }: SidebarNavProps) => (
  <nav className="flex flex-col gap-1">
    {NAV_ITEMS.map((item) => (
      <NavItem
        key={item.id}
        label={item.label}
        icon={item.icon}
        active={item.id === page}
        onClick={() => onNavigate(item.id)}
      />
    ))}
  </nav>
);
