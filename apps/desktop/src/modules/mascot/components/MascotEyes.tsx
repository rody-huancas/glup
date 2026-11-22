import { MascotEye } from '@/modules/mascot/components/MascotEye';
import { MascotPiece } from '@/modules/mascot/components/MascotPiece';
import type { MascotElements } from '@/modules/mascot/interfaces/elements';
import type { EyeStyle } from '@/modules/mascot/types/eyeStyle';
import { getVisibilityClass } from '@/modules/mascot/utils/pieceStyle';

interface MascotEyesProps {
  style    : EyeStyle;
  elements : MascotElements;
}

export const MascotEyes = ({ style, elements }: MascotEyesProps) => {
  const happyClass = getVisibilityClass(style === 'happy');

  return (
    <div ref={elements.eyes} className="pointer-events-none absolute inset-0">
      <MascotEye name="eye-left" eye={elements.eyeLeft} visible={style === 'open'} />
      <MascotEye name="eye-right" eye={elements.eyeRight} visible={style === 'open'} />
      <MascotPiece name="eye-happy-left" className={happyClass} />
      <MascotPiece name="eye-happy-right" className={happyClass} />
    </div>
  );
};
