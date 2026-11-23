import { ORGANIZE_TEXTS } from '@/modules/organize/constants/texts';
import { Button } from '@/shared/components/Button';

interface OrganizeFooterProps {
  note     : string;
  canSave  : boolean;
  onCancel : () => void;
  onSave   : () => void;
}

export const OrganizeFooter = ({ note, canSave, onCancel, onSave }: OrganizeFooterProps) => (
  <footer className="flex shrink-0 items-center gap-2 border-t border-line px-4 py-3">
    <p className="min-w-0 flex-1 truncate text-[12px] text-muted">{note}</p>
    <Button variant="secondary" onClick={onCancel} className="h-10">
      {ORGANIZE_TEXTS.cancel}
    </Button>
    <Button onClick={onSave} disabled={!canSave} className="h-10 disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:brightness-100">
      {ORGANIZE_TEXTS.save}
    </Button>
  </footer>
);
