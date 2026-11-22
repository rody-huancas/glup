import { Mascot } from '@/modules/mascot/components/Mascot';
import { WELCOME_TEXTS } from '@/modules/welcome/constants/texts';
import { WELCOME_MASCOT_WIDTH } from '@/modules/welcome/constants/welcome';
import { useWaveLoop } from '@/modules/welcome/hooks/useWaveLoop';
import { Button } from '@/shared/components/Button';

interface WelcomeScreenProps {
  onAnswer: (autostart: boolean) => void;
}

// First run: Glup big and waving, who it is, and whether it should start with the computer.
export const WelcomeScreen = ({ onAnswer }: WelcomeScreenProps) => {
  const controllerRef = useWaveLoop();

  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center bg-bg">
      <div className="flex max-w-[440px] flex-col items-center text-center">
        <div style={{ width: WELCOME_MASCOT_WIDTH }}>
          <Mascot controllerRef={controllerRef} reactToDrops={false} />
        </div>
        <h1 className="mt-6 text-2xl font-bold tracking-[-0.02em] text-text">{WELCOME_TEXTS.title}</h1>
        <p className="mt-2 text-sm text-muted">{WELCOME_TEXTS.body}</p>
        <p className="mt-6 text-[15px] font-semibold text-text">{WELCOME_TEXTS.question}</p>
        <div className="mt-3 flex gap-2">
          <Button onClick={() => onAnswer(true)}>{WELCOME_TEXTS.yes}</Button>
          <Button variant="secondary" onClick={() => onAnswer(false)}>
            {WELCOME_TEXTS.no}
          </Button>
        </div>
      </div>
    </div>
  );
};
