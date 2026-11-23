import { useState } from 'react';
import { PasswordField } from '@/modules/pdf/components/PasswordField';
import { StepHeader } from '@/modules/pdf/components/StepHeader';
import { PROTECT_TEXTS } from '@/modules/pdf/constants/protect';
import { Button } from '@/shared/components/Button';

interface UnlockStepProps {
  // Resolves false when the password is not the right one (the step stays to try again).
  onUnlock : (password: string) => Promise<boolean>;
  onBack   : () => void;
}

// "Quitar contraseña": only with the right one. A wrong try says so and keeps the field.
export const UnlockStep = ({ onUnlock, onBack }: UnlockStepProps) => {
  const [password, setPassword] = useState('');
  const [checking, setChecking] = useState(false);
  const [wrong, setWrong]       = useState(false);

  const submit = () => {
    if (password.length === 0 || checking) return;

    setChecking(true);
    void onUnlock(password)
      .then((right) => setWrong(!right))
      .catch(() => setWrong(true))
      .finally(() => setChecking(false));
  };

  return (
    <div className="flex flex-col">
      <StepHeader title={PROTECT_TEXTS.unlockTitle} onBack={onBack} />
      <div className="mt-2.5 flex items-end gap-2.5">
        <div className="min-w-0 flex-1">
          <PasswordField
            label={PROTECT_TEXTS.field}
            value={password}
            onChange={(value) => {
              setPassword(value);
              setWrong(false);
            }}
            autoFocus
            invalid={wrong}
            onEnter={submit}
          />
        </div>
        <Button onClick={submit} disabled={password.length === 0 || checking} className="h-10 shrink-0 disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:brightness-100">
          {checking ? PROTECT_TEXTS.checking : PROTECT_TEXTS.unlock}
        </Button>
      </div>
      <p className="mt-2 text-[12px] text-muted">
        {wrong ? <span className="text-[#E58A9A]">{PROTECT_TEXTS.wrong}</span> : PROTECT_TEXTS.unlockHint}
      </p>
    </div>
  );
};
