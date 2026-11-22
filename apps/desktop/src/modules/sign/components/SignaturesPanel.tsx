import { SignatureCard } from '@/modules/sign/components/SignatureCard';
import { SIGN_TEXTS } from '@/modules/sign/constants/sign';
import type { Signature } from '@/modules/sign/interfaces/signature';
import { Button } from '@/shared/components/Button';
import { SectionLabel } from '@/shared/components/SectionLabel';
import { PlusIcon } from '@/shared/icons/PlusIcon';

interface SignaturesPanelProps {
  signatures : Signature[];
  onUse      : (signature: Signature) => void;
  onDelete   : (signature: Signature) => void;
  onCreate   : () => void;
  onAddDate  : () => void;
  onAddText  : () => void;
}

export const SignaturesPanel = ({ signatures, onUse, onDelete, onCreate, onAddDate, onAddText }: SignaturesPanelProps) => (
  <aside className="flex w-[240px] shrink-0 flex-col gap-2.5">
    <SectionLabel>{SIGN_TEXTS.signatures}</SectionLabel>
    <div className="scroll-thin flex min-h-0 flex-col gap-2.5 overflow-y-auto pr-1">
      {signatures.length > 0 ? (
        <div className="grid grid-cols-2 gap-2">
          {signatures.map((signature, index) => (
            <SignatureCard key={signature.id} signature={signature} index={index + 1} onUse={onUse} onDelete={onDelete} />
          ))}
        </div>
      ) : (
        <p className="text-[12px] text-muted">{SIGN_TEXTS.noSignatures}</p>
      )}
      <button
        type="button"
        onClick={onCreate}
        className="flex h-10 shrink-0 cursor-pointer items-center justify-center gap-1.5 rounded-control border border-dashed border-line-dashed text-[13px] font-semibold text-lilac transition-colors hover:border-lilac hover:text-lilac-soft"
      >
        <PlusIcon className="size-4" />
        {SIGN_TEXTS.create}
      </button>
    </div>
    <div className="mt-auto flex flex-col gap-2 border-t border-line pt-3">
      <Button variant="secondary" onClick={onAddDate} className="h-9">
        {SIGN_TEXTS.addDate}
      </Button>
      <Button variant="secondary" onClick={onAddText} className="h-9">
        {SIGN_TEXTS.addText}
      </Button>
    </div>
  </aside>
);
