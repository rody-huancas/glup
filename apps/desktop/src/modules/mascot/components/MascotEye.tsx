import { PIECE_ASSETS } from '@/modules/mascot/constants/assets';
import type { EyeElements } from '@/modules/mascot/interfaces/elements';
import type { PieceName } from '@/modules/mascot/types/pieceName';
import { getPieceStyle, getVisibilityClass } from '@/modules/mascot/utils/pieceStyle';

interface MascotEyeProps {
  name    : PieceName;
  eye     : EyeElements;
  visible : boolean;
}

export const MascotEye = ({ name, eye, visible }: MascotEyeProps) => (
  <div
    ref={eye.wrapper}
    className={`pointer-events-none absolute ${getVisibilityClass(visible)}`}
    style={getPieceStyle(name)}
  >
    <img
      ref={eye.open}
      src={PIECE_ASSETS[name]}
      alt=""
      draggable={false}
      className="block h-auto w-full"
    />
  </div>
);
