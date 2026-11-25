import { SidebarFavoriteItem } from '@/modules/main-window/components/SidebarFavoriteItem';
import { SidebarSection } from '@/modules/main-window/components/SidebarSection';
import { SIDEBAR_TEXTS } from '@/modules/main-window/constants/sidebar';
import { useFavoriteDrag } from '@/modules/main-window/hooks/useFavoriteDrag';
import { TOOLS } from '@/modules/tools/constants/tools';
import { useFavorites } from '@/modules/tools/hooks/useFavorites';
import { moveFavoriteTool, removeFavoriteTool } from '@/modules/tools/store/favoritesStore';
import type { Tool } from '@/modules/tools/types/tool';
import { knownFavorites } from '@/modules/tools/utils/favorites';

interface SidebarFavoritesProps {
  onRun: (tool: Tool) => void;
}

// The tools marked with a star, in the order left: they run as from their card; they move by dragging
// (or Alt and the arrows) and go with ×.
export const SidebarFavorites = ({ onRun }: SidebarFavoritesProps) => {
  const tools = knownFavorites(useFavorites(), TOOLS);
  const drag  = useFavoriteDrag();

  return (
    <SidebarSection title={SIDEBAR_TEXTS.favorites}>
      {tools.length === 0 ? (
        <p className="px-2 py-1 text-[12px] text-muted">{SIDEBAR_TEXTS.noFavorites}</p>
      ) : (
        <ul ref={drag.list} className="flex flex-col gap-0.5">
          {tools.map((tool, index) => (
            <SidebarFavoriteItem
              key={tool.id}
              tool={tool}
              dragging={drag.from === index}
              dropBefore={drag.from !== null && drag.target === index && drag.target !== drag.from && drag.target !== drag.from + 1}
              onRun={onRun}
              onRemove={(item) => void removeFavoriteTool(item.id)}
              onGrab={drag.grab(index)}
              onMoveKey={(step) => void moveFavoriteTool(index, index + step)}
            />
          ))}
        </ul>
      )}
    </SidebarSection>
  );
};
