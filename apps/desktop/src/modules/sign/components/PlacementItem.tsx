import type { KeyboardEvent } from 'react';
import { PlacementToolbar } from '@/modules/sign/components/PlacementToolbar';
import { KEY_STEPS, SIGN_TEXTS, TEXT_FONT, TEXT_FONT_SIZES, TEXT_LINE_HEIGHT } from '@/modules/sign/constants/sign';
import { usePlacementDrag } from '@/modules/sign/hooks/usePlacementDrag';
import type { RelativeRect, Size } from '@/modules/sign/interfaces/geometry';
import type { SignPlacement } from '@/modules/sign/interfaces/placement';
import type { Corner } from '@/modules/sign/types/corner';
import { moveByPixels, relativeToScreen } from '@/modules/sign/utils/coordinates';
import { cx } from '@/shared/utils/classNames';

export interface PlacementActions {
  onSelect    : (id: string) => void;
  onMove      : (id: string, rect: RelativeRect) => void;
  onResize    : (id: string, rect: RelativeRect) => void;
  onRemove    : (id: string) => void;
  onDuplicate : (id: string) => void;
  onRepeat    : (id: string) => void;
  onText      : (id: string, text: string) => void;
  onFont      : (id: string, delta: number) => void;
  onEdit      : (id: string) => void;
  onStopEdit  : () => void;
}

interface PlacementItemProps {
  placement : SignPlacement;
  view      : Size;
  selected  : boolean;
  editing   : boolean;
  actions   : PlacementActions;
}

const CORNERS: Corner[] = ['top-left', 'top-right', 'bottom-left', 'bottom-right'];

const CORNER_CLASSES: Record<Corner, string> = {
  'top-left'     : '-left-1.5 -top-1.5 cursor-nwse-resize',
  'top-right'    : '-right-1.5 -top-1.5 cursor-nesw-resize',
  'bottom-left'  : '-bottom-1.5 -left-1.5 cursor-nesw-resize',
  'bottom-right' : '-bottom-1.5 -right-1.5 cursor-nwse-resize',
};

const ARROWS: Record<string, [number, number]> = {
  ArrowLeft  : [-1, 0],
  ArrowRight : [1, 0],
  ArrowUp    : [0, -1],
  ArrowDown  : [0, 1],
};

// Room the toolbar needs, to decide where it fits.
const TOOLBAR_ROOM = { height: 40, width: 320 };

// A signature or a text on the page: drag to move, corners to resize (keeping proportions), arrows to
// nudge (Shift: 10 px), Supr to remove; a text is typed in place.
export const PlacementItem = ({ placement, view, selected, editing, actions }: PlacementItemProps) => {
  const { id, rect, content } = placement;
  const screen                = relativeToScreen(rect, view);

  const drag = usePlacementDrag({
    rect,
    view,
    onSelect : () => actions.onSelect(id),
    onMove   : (next) => actions.onMove(id, next),
    onResize : (next) => actions.onResize(id, next),
  });

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (editing) return;

    const arrow = ARROWS[event.key];

    if (arrow) {
      event.preventDefault();
      const step = event.shiftKey ? KEY_STEPS.large : KEY_STEPS.small;
      actions.onMove(id, moveByPixels({ rect, dx: arrow[0] * step, dy: arrow[1] * step, view }));
      return;
    }

    if (event.key === 'Delete' || event.key === 'Backspace') {
      event.preventDefault();
      actions.onRemove(id);
      return;
    }

    if (event.key === 'Enter' && content.kind === 'text') actions.onEdit(id);
  };

  const fontPixels = screen.height / TEXT_LINE_HEIGHT;
  const label      = content.kind === 'text' ? content.text || SIGN_TEXTS.textField : SIGN_TEXTS.signatures;

  return (
    <div
      data-placement
      role="button"
      tabIndex={0}
      aria-label={label}
      aria-pressed={selected}
      onKeyDown={onKeyDown}
      onFocus={() => actions.onSelect(id)}
      onDoubleClick={() => content.kind === 'text' && actions.onEdit(id)}
      className={cx('absolute touch-none outline-none', editing ? 'cursor-text' : 'cursor-move', selected && 'z-10')}
      style={{ left: screen.left, top: screen.top, width: screen.width, height: screen.height }}
      {...(editing ? {} : drag.move)}
    >
      {content.kind === 'image' ? (
        <img src={content.url} alt="" draggable={false} className="pointer-events-none block h-full w-full" />
      ) : editing ? (
        <input
          autoFocus
          value={content.text}
          aria-label={SIGN_TEXTS.textField}
          onChange={(event) => actions.onText(id, event.target.value)}
          onBlur={actions.onStopEdit}
          onKeyDown={(event) => event.key === 'Enter' && actions.onStopEdit()}
          onPointerDown={(event) => event.stopPropagation()}
          className="block h-full w-full bg-white/70 p-0 text-black outline-none"
          style={{ fontSize: fontPixels, lineHeight: TEXT_LINE_HEIGHT, fontFamily: TEXT_FONT }}
        />
      ) : (
        <span className="pointer-events-none block whitespace-pre text-black" style={{ fontSize: fontPixels, lineHeight: TEXT_LINE_HEIGHT, fontFamily: TEXT_FONT }}>
          {content.text}
        </span>
      )}
      {selected && (
        <>
          <span className="pointer-events-none absolute -inset-1 rounded-sm border border-dashed border-mint" />
          {!editing &&
            CORNERS.map((corner) => (
              <span key={corner} className={cx('absolute size-3 rounded-sm border border-mint-ink bg-mint', CORNER_CLASSES[corner])} {...drag.corner(corner)} />
            ))}
          <PlacementToolbar
            isText={content.kind === 'text'}
            below={screen.top < TOOLBAR_ROOM.height}
            alignRight={screen.left + TOOLBAR_ROOM.width > view.width}
            onDuplicate={() => actions.onDuplicate(id)}
            onRepeat={() => actions.onRepeat(id)}
            onRemove={() => actions.onRemove(id)}
            onSmaller={() => actions.onFont(id, -TEXT_FONT_SIZES.step)}
            onBigger={() => actions.onFont(id, TEXT_FONT_SIZES.step)}
            onEdit={() => actions.onEdit(id)}
          />
        </>
      )}
    </div>
  );
};
