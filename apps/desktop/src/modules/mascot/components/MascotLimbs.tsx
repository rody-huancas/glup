import { MascotLimb } from '@/modules/mascot/components/MascotLimb';
import { LIMB_NAMES } from '@/modules/mascot/constants/limbs';
import type { MascotElements } from '@/modules/mascot/interfaces/elements';

interface MascotLimbsProps {
  limbs: MascotElements['limbs'];
}

// arm-wave only shows while waving, in place of arm-right.
export const MascotLimbs = ({ limbs }: MascotLimbsProps) => (
  <>
    {LIMB_NAMES.map((name) => (
      <MascotLimb key={name} name={name} limb={limbs[name]} hidden={name === 'arm-wave'} />
    ))}
  </>
);
