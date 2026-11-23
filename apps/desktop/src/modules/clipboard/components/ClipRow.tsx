import { ClipThumb } from '@/modules/clipboard/components/ClipThumb';
import { CLIPBOARD_TEXTS } from '@/modules/clipboard/constants/texts';
import type { Clip } from '@/modules/clipboard/interfaces/clip';
import { clipMeta, clipName } from '@/modules/clipboard/utils/clipView';
import type { CopyState } from '@/modules/history/types/copyState';
import { Checkbox } from '@/shared/components/Checkbox';
import { IconButton } from '@/shared/components/IconButton';
import { PinIcon } from '@/shared/icons/PinIcon';
import { TrashIcon } from '@/shared/icons/TrashIcon';
import { cx } from '@/shared/utils/classNames';

interface ClipRowProps {
  clip     : Clip;
  now      : Date;
  checked  : boolean;
  // "Copiado" (or why not) right after copying this line.
  copied   : CopyState | null;
  onToggle : (id: string) => void;
  onCopy   : (id: string) => void;
  onPin    : (clip: Clip) => void;
  onRemove : (id: string) => void;
}

// A check, the line itself (a button: click or Enter copies it again), then pin and remove.
export const ClipRow = ({ clip, now, checked, copied, onToggle, onCopy, onPin, onRemove }: ClipRowProps) => {
  const name = clipName(clip);

  return (
    <li className={cx('flex items-center gap-1 rounded-[14px] bg-raised pl-3 pr-1.5', clip.pinned && 'ring-1 ring-lilac/40')}>
      <Checkbox label={CLIPBOARD_TEXTS.selectLabel(name)} checked={checked} onChange={() => onToggle(clip.id)} />
      <button
        type="button"
        data-clip-line=""
        onClick={() => onCopy(clip.id)}
        className="flex min-w-0 flex-1 cursor-pointer items-center gap-3 rounded-[14px] py-2.5 pl-2 pr-2 text-left transition-colors hover:bg-line"
      >
        {clip.kind === 'image' && <ClipThumb id={clip.id} />}
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          {clip.kind === 'text' && <span className="line-clamp-3 whitespace-pre-line break-words text-[13px] leading-snug text-text">{clip.preview}</span>}
          <span className="truncate text-xs text-muted">
            {clip.pinned && <span className="font-semibold text-lilac">{CLIPBOARD_TEXTS.pinned} · </span>}
            {clipMeta(clip, now)}
          </span>
        </span>
        <span aria-live="polite" className={copied === 'failed' ? 'shrink-0 text-[12px] font-semibold text-lilac-soft' : 'shrink-0 text-[12px] font-semibold text-mint'}>
          {copied === 'copied' && CLIPBOARD_TEXTS.copied}
          {copied === 'failed' && CLIPBOARD_TEXTS.copyFailed}
        </span>
      </button>
      <IconButton icon={PinIcon} label={clip.pinned ? CLIPBOARD_TEXTS.unpin : CLIPBOARD_TEXTS.pin} active={clip.pinned} onClick={() => onPin(clip)} className="size-8" iconClass="size-4" />
      <IconButton icon={TrashIcon} label={CLIPBOARD_TEXTS.removeLabel(name)} onClick={() => onRemove(clip.id)} className="size-8" iconClass="size-4" />
    </li>
  );
};
