import { useEffect, useRef } from 'react';
import { OrganizeThumb } from '@/modules/organize/components/OrganizeThumb';
import { ORGANIZE_TEXTS } from '@/modules/organize/constants/texts';
import type { OrganizedPage } from '@/modules/organize/interfaces/organizedPage';
import type { TileActions } from '@/modules/organize/interfaces/tileActions';
import { selectModeOf } from '@/modules/organize/utils/selection';
import { IconButton } from '@/shared/components/IconButton';
import { RotateLeftIcon } from '@/shared/icons/RotateLeftIcon';
import { RotateRightIcon } from '@/shared/icons/RotateRightIcon';
import { TrashIcon } from '@/shared/icons/TrashIcon';
import { cx } from '@/shared/utils/classNames';

interface PageTileProps {
  path       : string;
  item       : OrganizedPage;
  selected   : boolean;
  focused    : boolean;
  // Being dragged right now (dimmed in place).
  dragging   : boolean;
  // Where the dragged pages would land: a bar before or after this tile.
  dropBefore : boolean;
  dropAfter  : boolean;
  // Move the keyboard focus here (it changed from the keyboard).
  takeFocus  : () => boolean;
  actions    : TileActions;
}

const DROP_BAR = 'pointer-events-none absolute inset-y-2 w-1 rounded-full bg-mint';

// The buttons show on hover, on keyboard focus and while chosen. A removed page stays, dimmed, with "Recuperar".
export const PageTile = ({ path, item, selected, focused, dragging, dropBefore, dropAfter, takeFocus, actions }: PageTileProps) => {
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const { page }  = item;

  useEffect(() => {
    if (!focused || !takeFocus()) return;

    buttonRef.current?.focus({ preventScroll: true });
    buttonRef.current?.scrollIntoView({ block: 'nearest' });
  });

  return (
    <li ref={actions.registerTile(page)} className={cx('group relative', dragging && 'opacity-40')}>
      {dropBefore && <span className={cx(DROP_BAR, '-left-2')} />}
      {dropAfter && <span className={cx(DROP_BAR, '-right-2')} />}
      <button
        ref={buttonRef}
        type="button"
        tabIndex={focused ? 0 : -1}
        aria-pressed={selected}
        aria-label={item.removed ? `${ORGANIZE_TEXTS.page(page)} · ${ORGANIZE_TEXTS.removed}` : ORGANIZE_TEXTS.page(page)}
        onClick={(event) => actions.takeClick() && actions.onSelect(page, selectModeOf(event))}
        onPointerDown={(event) => actions.onPointerDown(page, event)}
        onPointerMove={actions.onPointerMove}
        onPointerUp={actions.onPointerUp}
        onPointerCancel={actions.onPointerCancel}
        className={cx(
          'flex w-full cursor-grab touch-none select-none flex-col items-center gap-1.5 rounded-control border p-2 transition-colors active:cursor-grabbing',
          selected ? 'border-mint bg-[#24302E]' : 'border-line bg-raised hover:border-line-strong',
        )}
      >
        <OrganizeThumb path={path} page={page} rotation={item.rotation} removed={item.removed} />
        <span className={cx('text-[11px] font-semibold', selected ? 'text-mint' : 'text-muted')}>
          {item.removed ? ORGANIZE_TEXTS.removed : page}
        </span>
      </button>
      {item.removed ? (
        <button
          type="button"
          onClick={() => actions.onRestore(page)}
          className="absolute left-1/2 top-[42%] -translate-x-1/2 -translate-y-1/2 cursor-pointer rounded-control border border-line-strong bg-surface px-3 py-1.5 text-[12px] font-semibold text-text shadow-lg hover:bg-raised"
        >
          {ORGANIZE_TEXTS.restore}
        </button>
      ) : (
        <div
          className={cx(
            'absolute right-3 top-3 flex gap-0.5 rounded-control border border-line-strong bg-surface/95 p-0.5 shadow-lg transition-opacity',
            selected ? 'opacity-100' : 'opacity-0 focus-within:opacity-100 group-hover:opacity-100',
          )}
        >
          <IconButton icon={RotateLeftIcon} label={ORGANIZE_TEXTS.rotateLeft} onClick={() => actions.onRotate(page, 'left')} className="size-7" iconClass="size-4" />
          <IconButton icon={RotateRightIcon} label={ORGANIZE_TEXTS.rotateRight} onClick={() => actions.onRotate(page, 'right')} className="size-7" iconClass="size-4" />
          <IconButton icon={TrashIcon} label={ORGANIZE_TEXTS.remove} onClick={() => actions.onRemove(page)} className="size-7" iconClass="size-4" />
        </div>
      )}
    </li>
  );
};
