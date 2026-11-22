import { SIGN_TEXTS } from '@/modules/sign/constants/sign';
import { Button } from '@/shared/components/Button';

interface SignFooterProps {
  canSave  : boolean;
  onCancel : () => void;
  onSave   : () => void;
}

export const SignFooter = ({ canSave, onCancel, onSave }: SignFooterProps) => (
  <footer className="flex shrink-0 items-center gap-2 border-t border-line px-4 py-3">
    <p className="min-w-0 flex-1 text-[11px] text-muted">{SIGN_TEXTS.note}</p>
    <Button variant="secondary" onClick={onCancel} className="h-10">
      {SIGN_TEXTS.cancel}
    </Button>
    <Button onClick={onSave} disabled={!canSave} className="h-10 disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:brightness-100">
      {SIGN_TEXTS.save}
    </Button>
  </footer>
);
