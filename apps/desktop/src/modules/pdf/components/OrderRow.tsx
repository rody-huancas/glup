import type { PointerEvent } from 'react';
import { PDF_TEXTS, THUMBNAIL_HEIGHTS } from '@/modules/pdf/constants/pdf';
import type { OrderItem } from '@/modules/pdf/interfaces/orderItem';
import { FileThumb } from '@/modules/pdf/components/FileThumb';
import { IconButton } from '@/shared/components/IconButton';
import { ChevronUpIcon } from '@/shared/icons/ChevronUpIcon';
import { GripIcon } from '@/shared/icons/GripIcon';
import { cx } from '@/shared/utils/classNames';

interface OrderRowProps {
  item         : OrderItem;
  index        : number;
  count        : number;
  dragging     : boolean;
  offset       : number;
  onMove       : (from: number, to: number) => void;
  onHandleDown : (index: number, event: PointerEvent<HTMLElement>) => void;
  onHandleMove : (event: PointerEvent<HTMLElement>) => void;
  onHandleUp   : () => void;
}

export const OrderRow = ({ item, index, count, dragging, offset, onMove, onHandleDown, onHandleMove, onHandleUp }: OrderRowProps) => (
  <li
    className={cx('relative flex h-14 items-center gap-2.5 rounded-control border border-line bg-raised px-2', dragging && 'z-10 border-mint/50 shadow-lg')}
    style={dragging ? { transform: `translateY(${offset}px)` } : undefined}
  >
    <button
      type="button"
      aria-label={PDF_TEXTS.dragHandle}
      title={PDF_TEXTS.dragHandle}
      className="flex h-10 w-6 shrink-0 cursor-grab touch-none items-center justify-center text-muted active:cursor-grabbing"
      onPointerDown={(event) => onHandleDown(index, event)}
      onPointerMove={onHandleMove}
      onPointerUp={onHandleUp}
      onPointerCancel={onHandleUp}
    >
      <GripIcon className="size-4" />
    </button>
    <FileThumb path={item.path} kind={item.kind} height={THUMBNAIL_HEIGHTS.order - 8} className="w-8" />
    <div className="min-w-0 flex-1">
      <p className="truncate text-[13px] font-semibold text-text">{item.name}</p>
      {item.pages !== null && <p className="text-[11px] text-muted">{PDF_TEXTS.pagesCount(item.pages)}</p>}
    </div>
    <IconButton icon={ChevronUpIcon} label={PDF_TEXTS.moveUp} onClick={() => onMove(index, index - 1)} disabled={index === 0} className="size-8" />
    <IconButton
      icon={ChevronUpIcon}
      label={PDF_TEXTS.moveDown}
      onClick={() => onMove(index, index + 1)}
      disabled={index === count - 1}
      className="size-8"
      iconClass="rotate-180"
    />
  </li>
);
