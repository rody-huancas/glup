import { CLIPBOARD_INTRO_TEXTS, CLIPBOARD_TEXTS } from '@/modules/clipboard/constants/texts';
import { Button } from '@/shared/components/Button';
import { Card } from '@/shared/components/Card';
import { ClipboardIcon } from '@/shared/icons/ClipboardIcon';

interface ClipboardIntroProps {
  supported : boolean;
  onTurnOn  : () => void;
  onLater   : () => void;
}

// Off (as it comes): what it would keep, in plain words, and the choice to turn it on.
export const ClipboardIntro = ({ supported, onTurnOn, onLater }: ClipboardIntroProps) => (
  <Card className="flex max-w-[560px] flex-col gap-4 p-5">
    <div className="flex items-center gap-3">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-control bg-bg text-lilac">
        <ClipboardIcon />
      </span>
      <h2 className="text-[15px] font-semibold text-text">{CLIPBOARD_INTRO_TEXTS.title}</h2>
    </div>
    <ul className="flex flex-col gap-2 pl-1">
      {CLIPBOARD_INTRO_TEXTS.points.map((point) => (
        <li key={point} className="flex gap-2.5 text-[13px] leading-relaxed text-muted">
          <span aria-hidden className="mt-2 size-1.5 shrink-0 rounded-full bg-mint" />
          {point}
        </li>
      ))}
    </ul>
    {supported ? (
      <div className="flex gap-2">
        <Button onClick={onTurnOn} className="h-9">
          {CLIPBOARD_INTRO_TEXTS.turnOn}
        </Button>
        <Button variant="secondary" onClick={onLater} className="h-9">
          {CLIPBOARD_INTRO_TEXTS.later}
        </Button>
      </div>
    ) : (
      <p className="text-[13px] text-lilac-soft">{CLIPBOARD_TEXTS.unsupported}</p>
    )}
  </Card>
);
