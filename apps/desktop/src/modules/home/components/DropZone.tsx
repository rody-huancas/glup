import { DROP_ZONE_FACE, HOME_TEXTS } from '@/modules/home/constants/home';
import { useDropZoneLayout } from '@/modules/home/hooks/useDropZoneLayout';
import type { HomeFiles } from '@/modules/home/interfaces/homeFiles';
import { Mascot } from '@/modules/mascot/components/Mascot';
import { Button } from '@/shared/components/Button';
import { REVEAL_PROPS } from '@/shared/constants/reveal';
import { cx } from '@/shared/utils/classNames';

interface DropZoneProps {
  files   : HomeFiles;
  compact : boolean;
}

// Fills the free height of Home with Glup and the text side by side, centered; shrinks while the actions panel is open.
export const DropZone = ({ files, compact }: DropZoneProps) => {
  const { zone, mascot, hint } = useDropZoneLayout(compact);

  return (
    <section
      ref={zone}
      {...REVEAL_PROPS.card}
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
      <div className="flex min-w-0 flex-col items-start">
        <p className="text-[22px] font-semibold leading-tight text-text">{files.notice ?? HOME_TEXTS.dropTitle}</p>
        <p ref={hint} className="mt-2 overflow-hidden text-[15px] leading-snug text-muted">{HOME_TEXTS.dropHint}</p>
        <Button onClick={files.pickFiles} className="mt-4 h-12 shrink-0 text-sm">
          {HOME_TEXTS.chooseFiles}
        </Button>
      </div>
    </section>
  );
};

// Column layout: Glup of 150 px above the text, everything centered.
// <section className="flex min-h-[180px] flex-1 flex-col items-center justify-center gap-3 ... px-5 text-center">
//   <div ref={mascot} className="w-[150px] shrink-0">…</div>
//   <p className="text-[22px] font-semibold leading-tight text-text">…</p>
//   <p ref={hint} className="-mt-3 pt-3 text-[15px] leading-snug text-muted">…</p>
//   <Button className="h-12 shrink-0 text-sm">…</Button>
// </section>
