import { TOOLS_TEXTS } from '@/modules/tools/constants/texts';
import { useFavorites } from '@/modules/tools/hooks/useFavorites';
import { toggleFavoriteTool } from '@/modules/tools/store/favoritesStore';
import { isFavorite } from '@/modules/tools/utils/favorites';
import { StarIcon } from '@/shared/icons/StarIcon';
import { cx } from '@/shared/utils/classNames';

interface FavoriteStarProps {
  id    : string;
  title : string;
}

// The star of a tool card: shows on hover and on focus (always, once marked); a real toggle button.
export const FavoriteStar = ({ id, title }: FavoriteStarProps) => {
  const marked = isFavorite(useFavorites(), id);

  return (
    <button
      type="button"
      aria-pressed={marked}
      aria-label={marked ? TOOLS_TEXTS.unstar(title) : TOOLS_TEXTS.star(title)}
      title={marked ? TOOLS_TEXTS.unstarHint : TOOLS_TEXTS.starHint}
      onClick={() => void toggleFavoriteTool(id)}
      className={cx(
        'relative z-10 flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-md transition-[opacity,color] outline-none focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-lilac',
        marked ? 'text-warn opacity-100' : 'text-muted opacity-0 group-hover:opacity-100 hover:text-text',
      )}
    >
      <StarIcon className="size-4" filled={marked} />
    </button>
  );
};
