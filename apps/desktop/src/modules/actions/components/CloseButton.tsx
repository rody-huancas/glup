import { ACTIONS_TEXTS } from '@/modules/actions/constants/texts';

interface CloseButtonProps {
  onClose: () => void;
}

export const CloseButton = ({ onClose }: CloseButtonProps) => (
  <button
    type="button"
    aria-label={ACTIONS_TEXTS.close}
    onClick={onClose}
    className="flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-control text-muted transition-colors hover:bg-raised hover:text-text"
  >
    <svg viewBox="0 0 16 16" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <path d="M4 4l8 8M12 4l-8 8" />
    </svg>
  </button>
);
