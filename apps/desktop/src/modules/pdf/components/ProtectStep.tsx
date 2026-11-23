import { useState } from 'react';
import { PasswordField } from '@/modules/pdf/components/PasswordField';
import { StepHeader } from '@/modules/pdf/components/StepHeader';
import { PROTECT_TEXTS } from '@/modules/pdf/constants/protect';
import { canProtect, newPasswordProblem } from '@/modules/pdf/utils/password';
import { Button } from '@/shared/components/Button';

interface ProtectStepProps {
  onProtect : (password: string) => void;
  onBack    : () => void;
}

// "Poner contraseña": typed twice, at least 4 characters. It lives only in this step until it runs.
export const ProtectStep = ({ onProtect, onBack }: ProtectStepProps) => {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm]   = useState('');

  const problem = newPasswordProblem({ password, confirm });
  const ready   = canProtect({ password, confirm });
  const submit  = () => ready && onProtect(password);

  return (
    <div className="flex flex-col">
      <StepHeader title={PROTECT_TEXTS.title} onBack={onBack} />
      <div className="mt-2.5 grid grid-cols-2 gap-2.5">
        <PasswordField label={PROTECT_TEXTS.field} value={password} onChange={setPassword} autoFocus invalid={problem === PROTECT_TEXTS.tooShort} onEnter={submit} />
        <PasswordField label={PROTECT_TEXTS.confirm} value={confirm} onChange={setConfirm} invalid={problem === PROTECT_TEXTS.different} onEnter={submit} />
      </div>
      <div className="mt-2 flex items-center gap-3">
        <p className="min-w-0 flex-1 text-[12px] text-muted">
          {problem ? <span className="text-[#E58A9A]">{problem}</span> : PROTECT_TEXTS.hint}
        </p>
        <Button onClick={submit} disabled={!ready} className="h-10 shrink-0 disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:brightness-100">
          {PROTECT_TEXTS.button}
        </Button>
      </div>
    </div>
  );
};
