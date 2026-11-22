import { COMING_SOON_FACE, MAIN_WINDOW_TEXTS } from '@/modules/main-window/constants/mainWindow';
import { Mascot } from '@/modules/mascot/components/Mascot';

export const ComingSoon = () => (
  <div className="flex h-full min-h-[360px] flex-col items-center justify-center gap-4">
    <div className="w-28">
      <Mascot face={COMING_SOON_FACE} reactToDrops={false} />
    </div>
    <p className="text-[15px] font-medium text-muted">{MAIN_WINDOW_TEXTS.comingSoon}</p>
  </div>
);
