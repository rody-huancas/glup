import { ACCEPTED_LABELS, DROP_ZONE_FACE, HOME_TEXTS } from '@/modules/home/constants/home';
import { useDropZoneLayout } from '@/modules/home/hooks/useDropZoneLayout';
import type { HomeFiles } from '@/modules/home/interfaces/homeFiles';
import { acceptedKinds, joinWords } from '@/modules/home/utils/accepted';
import { Mascot } from '@/modules/mascot/components/Mascot';
import { TOOLS } from '@/modules/tools/constants/tools';
import { Button } from '@/shared/components/Button';
import { REVEAL_PROPS } from '@/shared/constants/reveal';
import { cx } from '@/shared/utils/classNames';

interface DropZoneProps {
  files   : HomeFiles;
  compact : boolean;
}

const ACCEPTED = joinWords(acceptedKinds({ tools: TOOLS, labels: ACCEPTED_LABELS }));

// Big: Glup and the text side by side, filling the free height of Home. With files chosen (or a task
// showing) it becomes a one-line bar (small Glup, "Suelta más archivos o elige" and the button), so the
// task gets the room. Both layouts are in the page; the hidden one is inert, so focus and screen readers
// only find the visible button. Dropping works the same on either (the drop is caught by the window).
export const DropZone = ({ files, compact }: DropZoneProps) => {
  const { zone, mascot, full, bar } = useDropZoneLayout(compact);
  const title                       = files.notice ?? HOME_TEXTS.dropTitle;

  return (
    <section
      ref={zone}
      {...REVEAL_PROPS.card}
      aria-label={HOME_TEXTS.dropTitle}
      className={cx(
        'flex min-h-[200px] flex-1 items-center justify-center gap-7 overflow-hidden rounded-[18px] border-2 border-dashed bg-[#201F27] p-8 transition-colors',
        files.dragging ? 'border-mint' : 'border-line-dashed',
      )}
    >
      <div ref={mascot} className="w-[120px] shrink-0">
        <Mascot
          controllerRef={files.dropMascotRef}
          onStateChange={files.onDropMascotStateChange}
          face={DROP_ZONE_FACE}
        />
      </div>
      <div ref={full} inert={compact} aria-hidden={compact} className="flex min-w-0 flex-col items-start overflow-hidden">
        <p className="text-[22px] font-semibold leading-tight text-text">{title}</p>
        <p className="mt-1.5 text-[13px] leading-snug text-muted/80">{ACCEPTED}</p>
        {/* <p ref={hint} className="mt-2 overflow-hidden text-[15px] leading-snug text-muted">{HOME_TEXTS.dropHint}</p> */}
        <Button onClick={files.pickFiles} className="mt-4 h-12 shrink-0 text-sm">
          {HOME_TEXTS.chooseFiles}
        </Button>
      </div>
      <div ref={bar} inert={!compact} aria-hidden={!compact} className="hidden min-w-0 flex-1 items-center gap-3 overflow-hidden">
        <p className="min-w-0 flex-1 truncate text-[14px] font-medium text-text">{files.notice ?? HOME_TEXTS.dropMore}</p>
        <Button variant="secondary" onClick={files.pickFiles} className="h-9 shrink-0 px-3 text-xs">
          {HOME_TEXTS.chooseFiles}
        </Button>
      </div>
    </section>
  );
};

// Before: one layout that only got shorter (Glup of 64 px, the hint folded away, the title and the button
// kept), 120 px tall.
// <div className="flex min-w-0 flex-col items-start">
//   <p className="text-[22px] font-semibold leading-tight text-text">{files.notice ?? HOME_TEXTS.dropTitle}</p>
//   <p ref={hint} className="mt-2 overflow-hidden text-[15px] leading-snug text-muted">{HOME_TEXTS.dropHint}</p>
//   <Button onClick={files.pickFiles} className="mt-4 h-12 shrink-0 text-sm">{HOME_TEXTS.chooseFiles}</Button>
// </div>

// Column layout: Glup of 150 px above the text, everything centered.
// <section className="flex min-h-[180px] flex-1 flex-col items-center justify-center gap-3 ... px-5 text-center">
//   <div ref={mascot} className="w-[150px] shrink-0">…</div>
//   <p className="text-[22px] font-semibold leading-tight text-text">…</p>
//   <p ref={hint} className="-mt-3 pt-3 text-[15px] leading-snug text-muted">…</p>
//   <Button className="h-12 shrink-0 text-sm">…</Button>
// </section>
