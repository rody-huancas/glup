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

// The mint strip of Inicio: Glup, «¿Qué le damos de comer hoy?», what it takes and «Elegir archivos»;
// the whole strip is the drop zone (its dashed border lights up while a file is dragged over the window).
// In one row: Glup, the text and the button at the end. With files chosen (or a task
// showing) it becomes a one-line bar (small Glup, "Suelta más archivos o elige" and the button), so the
// task gets the room. Both layouts are in the page; the hidden one is inert, so focus and screen readers
// only find the visible button. Dropping works the same on either (the drop is caught by the window).
export const DropZone = ({ files, compact }: DropZoneProps) => {
  const { zone, mascot, full, bar } = useDropZoneLayout(compact);
  const title                       = files.notice ?? HOME_TEXTS.title;

  return (
    <section
      ref={zone}
      {...REVEAL_PROPS.card}
      aria-label={HOME_TEXTS.dropTitle}
      className={cx(
        'flex min-h-[88px] shrink-0 items-center gap-[18px] overflow-hidden rounded-[22px] border-2 border-dashed bg-mint px-[22px] py-3 text-mint-ink transition-colors',
        files.dragging ? 'border-mint-ink' : 'border-mint-ink/25',
      )}
    >
      <div ref={mascot} className="w-[60px] shrink-0">
        <Mascot
          controllerRef={files.dropMascotRef}
          onStateChange={files.onDropMascotStateChange}
          face={DROP_ZONE_FACE}
        />
      </div>
      <div ref={full} inert={compact} aria-hidden={compact} className="flex min-w-0 flex-1 items-center gap-4 overflow-hidden">
        <div className="flex min-w-0 flex-1 flex-col">
          <h1 {...REVEAL_PROPS.heading} className="truncate text-[20px] leading-tight font-bold tracking-[-0.02em]">{title}</h1>
          <p className="mt-1 truncate text-[12px] leading-snug font-medium">{HOME_TEXTS.dropTitle} · {ACCEPTED}</p>
        </div>
        <Button variant="ink" onClick={files.pickFiles} className="h-10 shrink-0 text-sm">
          {HOME_TEXTS.chooseFiles}
        </Button>
      </div>
      <div ref={bar} inert={!compact} aria-hidden={!compact} className="hidden min-w-0 flex-1 items-center gap-3 overflow-hidden">
        <p className="min-w-0 flex-1 truncate text-[14px] font-semibold">{files.notice ?? HOME_TEXTS.dropMore}</p>
        <Button variant="ink" onClick={files.pickFiles} className="h-9 shrink-0 px-3 text-xs">
          {HOME_TEXTS.chooseFiles}
        </Button>
      </div>
    </section>
  );
};
