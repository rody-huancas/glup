import { PIECE_ASSETS } from '@/modules/mascot/constants/assets';
import type { LimbElements } from '@/modules/mascot/interfaces/elements';
import type { LimbName } from '@/modules/mascot/types/limbName';
import { getLimbStyle } from '@/modules/mascot/utils/pieceStyle';

interface MascotLimbProps {
  name   : LimbName;
  limb   : LimbElements;
  hidden : boolean;
}

// Two nested wrappers share the pivot, so the breathing swing and the state motion add up.
export const MascotLimb = ({ name, limb, hidden }: MascotLimbProps) => (
  <div ref={limb.sway} className="pointer-events-none absolute" style={getLimbStyle(name)}>
    <div ref={limb.move} className={hidden ? 'invisible opacity-0' : undefined} style={{ transformOrigin: getLimbStyle(name).transformOrigin }}>
      <img src={PIECE_ASSETS[name]} alt="" draggable={false} className="block h-auto w-full" />
    </div>
  </div>
);
