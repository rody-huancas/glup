import { MascotPiece } from '@/modules/mascot/components/MascotPiece';
import { MOUTH_KINDS, MOUTH_PIECES } from '@/modules/mascot/constants/mouths';
import type { MascotElements } from '@/modules/mascot/interfaces/elements';
import type { MouthKind } from '@/modules/mascot/types/mouthKind';
import { getVisibilityClass } from '@/modules/mascot/utils/pieceStyle';

interface MascotMouthsProps {
  mouth  : MouthKind;
  mouths : MascotElements['mouths'];
}

export const MascotMouths = ({ mouth, mouths }: MascotMouthsProps) => (
  <>
    {MOUTH_KINDS.map((kind) => (
      <MascotPiece
        key={kind}
        name={MOUTH_PIECES[kind]}
        imageRef={mouths[kind]}
        className={getVisibilityClass(kind === mouth)}
      />
    ))}
  </>
);
