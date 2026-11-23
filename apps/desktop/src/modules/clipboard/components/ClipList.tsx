import type { KeyboardEvent, RefObject } from 'react';
import { ClipRow } from '@/modules/clipboard/components/ClipRow';
import type { Clip } from '@/modules/clipboard/interfaces/clip';
import type { CopiedLine } from '@/modules/clipboard/interfaces/copiedLine';

interface ClipListProps {
  clips     : Clip[];
  now       : Date;
  selected  : string[];
  copied    : CopiedLine | null;
  listRef   : RefObject<HTMLUListElement | null>;
  onKeyDown : (event: KeyboardEvent<HTMLUListElement>) => void;
  onToggle  : (id: string) => void;
  onCopy    : (id: string) => void;
  onPin     : (clip: Clip) => void;
  onRemove  : (id: string) => void;
}

// Only this list scrolls; the arrows move between its lines.
export const ClipList = ({ clips, now, selected, copied, listRef, onKeyDown, onToggle, onCopy, onPin, onRemove }: ClipListProps) => (
  <ul ref={listRef} onKeyDown={onKeyDown} className="-mr-3 flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto scroll-thin pr-3">
    {clips.map((clip) => (
      <ClipRow
        key={clip.id}
        clip={clip}
        now={now}
        checked={selected.includes(clip.id)}
        copied={copied?.id === clip.id ? copied.state : null}
        onToggle={onToggle}
        onCopy={onCopy}
        onPin={onPin}
        onRemove={onRemove}
      />
    ))}
  </ul>
);
