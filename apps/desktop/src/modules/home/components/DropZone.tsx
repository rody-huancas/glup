import { DROP_ZONE_FACE, HOME_TEXTS } from '@/modules/home/constants/home';
import type { HomeFiles } from '@/modules/home/interfaces/homeFiles';
import { Mascot } from '@/modules/mascot/components/Mascot';
import { Button } from '@/shared/components/Button';
import { REVEAL_PROPS } from '@/shared/constants/reveal';
import { cx } from '@/shared/utils/classNames';

interface DropZoneProps {
  files: HomeFiles;
}

export const DropZone = ({ files }: DropZoneProps) => (
  <section
    {...REVEAL_PROPS.card}
    className={cx(
      'flex h-[150px] items-center gap-4 rounded-[18px] border-2 border-dashed bg-[#201F27] px-5 transition-colors',
      files.dragging ? 'border-mint' : 'border-line-dashed',
    )}
  >
    <div className="w-[100px] shrink-0">
      <Mascot
        controllerRef={files.dropMascotRef}
        onStateChange={files.onDropMascotStateChange}
        face={DROP_ZONE_FACE}
      />
    </div>
    <div className="flex min-w-0 flex-col items-start">
      <p className="text-[15px] font-semibold leading-snug text-text">{files.notice ?? HOME_TEXTS.dropTitle}</p>
      <p className="mt-0.5 text-xs text-muted">{HOME_TEXTS.dropHint}</p>
      <Button onClick={files.pickFiles} className="mt-2.5 h-9 text-[13px]">
        {HOME_TEXTS.chooseFiles}
      </Button>
    </div>
  </section>
);
