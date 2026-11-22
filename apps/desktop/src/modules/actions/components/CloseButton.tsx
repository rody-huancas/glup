import { ACTIONS_TEXTS } from '@/modules/actions/constants/texts';
import { IconButton } from '@/shared/components/IconButton';
import { CloseIcon } from '@/shared/icons/CloseIcon';

interface CloseButtonProps {
  onClose: () => void;
}

export const CloseButton = ({ onClose }: CloseButtonProps) => (
  <IconButton icon={CloseIcon} label={ACTIONS_TEXTS.close} onClick={onClose} className="size-8" />
);
