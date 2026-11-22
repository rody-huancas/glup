import { SIGN_TEXTS } from '@/modules/sign/constants/sign';
import type { Signature } from '@/modules/sign/interfaces/signature';
import { TrashIcon } from '@/shared/icons/TrashIcon';

interface SignatureCardProps {
  signature : Signature;
  index     : number;
  onUse     : (signature: Signature) => void;
  onDelete  : (signature: Signature) => void;
}

// Preview on light paper; a tap places it, the bin asks before deleting.
export const SignatureCard = ({ signature, index, onUse, onDelete }: SignatureCardProps) => (
  <div className="group relative">
    <button
      type="button"
      aria-label={SIGN_TEXTS.useSignature(index)}
      onClick={() => onUse(signature)}
      className="flex h-16 w-full cursor-pointer items-center justify-center rounded-control border border-line bg-[#F7F6FB] p-2 transition-colors hover:border-mint"
    >
      <img src={signature.url} alt="" draggable={false} className="max-h-full max-w-full object-contain" />
    </button>
    <button
      type="button"
      aria-label={SIGN_TEXTS.deleteSignature}
      title={SIGN_TEXTS.deleteSignature}
      onClick={() => onDelete(signature)}
      className="absolute right-1 top-1 flex size-6 cursor-pointer items-center justify-center rounded-md bg-surface/90 text-muted opacity-0 transition-opacity hover:text-[#E58A9A] focus-visible:opacity-100 group-hover:opacity-100"
    >
      <TrashIcon className="size-3.5" />
    </button>
  </div>
);
