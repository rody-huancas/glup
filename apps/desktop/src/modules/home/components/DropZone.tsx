import { DROP_ZONE_FACE, HOME_TEXTS } from '@/modules/home/constants/home';
import { useDropZoneLayout } from '@/modules/home/hooks/useDropZoneLayout';
import { useGreeting } from '@/modules/home/hooks/useGreeting';
import type { HomeFiles } from '@/modules/home/interfaces/homeFiles';
import { Mascot } from '@/modules/mascot/components/Mascot';
import { Button } from '@/shared/components/Button';
import { REVEAL_PROPS } from '@/shared/constants/reveal';
import { cx } from '@/shared/utils/classNames';

interface DropZoneProps {
  files   : HomeFiles;
  compact : boolean;
}

// The mint card of Inicio: a big Glup, the greeting of the hour («¡Buenos días, Ana!»), «Suelta algo aquí
// o elige qué hacemos» and «Elegir archivos»; the whole card is the drop zone (its dashed border lights up
// while a file is dragged over the window). With files chosen (or a task showing) it becomes a one-line
// bar (small Glup, "Suelta más archivos o elige" and the button), so the task gets the room. Both layouts
// are in the page; the hidden one is inert, so focus and screen readers only find the visible button.
// Dropping works the same on either (the drop is caught by the window).
export const DropZone = ({ files, compact }: DropZoneProps) => {
  const { zone, mascot, full, bar } = useDropZoneLayout(compact);
  const greeting                    = useGreeting();
  const title                       = files.notice ?? greeting;

  return (
    <section
      ref={zone}
      {...REVEAL_PROPS.card}
      aria-label={HOME_TEXTS.dropTitle}
      className={cx(
        'flex min-w-0 shrink-0 items-center gap-5 overflow-hidden rounded-[22px] border-2 border-dashed bg-mint px-[22px] py-4 text-mint-ink transition-colors',
        // The bar's height is GSAP's alone: a minimum here would keep it tall.
        !compact && 'min-h-[152px]',
        files.dragging ? 'border-mint-ink' : 'border-mint-ink/25',
      )}
    >
      <div ref={mascot} className="w-[104px] shrink-0">
        <Mascot
          controllerRef={files.dropMascotRef}
          onStateChange={files.onDropMascotStateChange}
          face={DROP_ZONE_FACE}
        />
      </div>
      <div ref={full} inert={compact} aria-hidden={compact} className="flex min-w-0 flex-1 flex-col items-start gap-3 overflow-hidden">
        <div className="flex min-w-0 max-w-full flex-col">
          <h1 {...REVEAL_PROPS.heading} className="text-[22px] leading-tight font-bold tracking-[-0.02em] break-words">{title}</h1>
          <p className="mt-1 text-[13px] leading-snug font-medium">{HOME_TEXTS.dropHint}</p>
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
