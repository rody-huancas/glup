import type { KeyboardEvent, PointerEvent } from 'react';
import { FAMILY_STYLES } from '@/modules/families/constants/families';
import { SIDEBAR_TEXTS } from '@/modules/main-window/constants/sidebar';
import type { Tool } from '@/modules/tools/types/tool';
import { CloseIcon } from '@/shared/icons/CloseIcon';
import { GripIcon } from '@/shared/icons/GripIcon';
import { cx } from '@/shared/utils/classNames';

interface SidebarFavoriteItemProps {
  tool        : Tool;
  dragging    : boolean;
  // Where the dragged one would land: a line above this one.
  dropBefore  : boolean;
  onRun       : (tool: Tool) => void;
  onRemove    : (tool: Tool) => void;
  onGrab      : (event: PointerEvent<HTMLButtonElement>) => void;
  onMoveKey   : (step: number) => void;
}

// A favorite: its grip (drag it, or Alt and the arrows), its name in its family's color, and ×.
export const SidebarFavoriteItem = ({ tool, dragging, dropBefore, onRun, onRemove, onGrab, onMoveKey }: SidebarFavoriteItemProps) => {
  const style = FAMILY_STYLES[tool.family];

  const onKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (!event.altKey || (event.key !== 'ArrowUp' && event.key !== 'ArrowDown')) return;
    event.preventDefault();
    onMoveKey(event.key === 'ArrowUp' ? -1 : 1);
  };

  return (
    <li className={cx('group relative flex h-9 items-center gap-1 rounded-control pr-1 hover:bg-raised', dragging && 'bg-raised opacity-70')} onKeyDown={onKeyDown}>
      {dropBefore && <span aria-hidden className={cx('absolute inset-x-1 -top-0.5 h-0.5 rounded-full', style.fill)} />}
      <button
        type="button"
        aria-label={SIDEBAR_TEXTS.move(tool.title)}
        onPointerDown={onGrab}
        className="flex h-full w-5 shrink-0 cursor-grab touch-none items-center justify-center text-muted opacity-0 outline-none group-hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-lilac active:cursor-grabbing"
      >
        <GripIcon className="size-3.5" />
      </button>
      <button type="button" onClick={() => onRun(tool)} className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 rounded-md text-left text-[13px] font-medium text-[#D6D3E3] outline-none focus-visible:outline-2 focus-visible:outline-lilac">
        <span aria-hidden className={cx('size-2 shrink-0 rounded-full', style.fill)} />
        <span className="truncate">{tool.title}</span>
      </button>
      <button
        type="button"
        aria-label={SIDEBAR_TEXTS.remove(tool.title)}
        onClick={() => onRemove(tool)}
        className="flex size-6 shrink-0 cursor-pointer items-center justify-center rounded-md text-muted opacity-0 outline-none group-hover:opacity-100 hover:text-text focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-lilac"
      >
        <CloseIcon className="size-3.5" />
      </button>
    </li>
  );
};
