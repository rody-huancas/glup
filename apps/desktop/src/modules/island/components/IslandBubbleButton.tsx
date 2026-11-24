import type { IslandPlacement } from '@/modules/dock/interfaces/islandPlacement';
import { ISLAND_TEXTS } from '@/modules/island/constants/texts';
import { getBubbleStyle } from '@/modules/island/utils/islandStyles';

interface IslandBubbleButtonProps {
  placement : IslandPlacement;
  onOpen    : () => void;
}

// The resting bubble is a real button over its circle: a click (or Enter and Space with the focus) opens
// it. Pressing and moving drags it instead (the gesture is heard by the island around it).
export const IslandBubbleButton = ({ placement, onOpen }: IslandBubbleButtonProps) => (
  <button
    type="button"
    aria-label={ISLAND_TEXTS.openBubble}
    onClick={onOpen}
    className="absolute cursor-pointer rounded-full bg-transparent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mint"
    style={getBubbleStyle(placement)}
  />
);
