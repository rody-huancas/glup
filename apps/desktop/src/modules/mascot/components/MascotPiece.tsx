import { PIECE_ASSETS } from '@/modules/mascot/constants/assets';
import type { ElementRef } from '@/modules/mascot/interfaces/elements';
import type { PieceName } from '@/modules/mascot/types/pieceName';
import { getPieceStyle } from '@/modules/mascot/utils/pieceStyle';

interface MascotPieceProps {
  name       : PieceName;
  className? : string;
  imageRef?  : ElementRef<HTMLImageElement>;
}

export const MascotPiece = ({ name, className = '', imageRef }: MascotPieceProps) => (
  <img
    ref={imageRef}
    src={PIECE_ASSETS[name]}
    alt=""
    draggable={false}
    className={`pointer-events-none absolute block h-auto ${className}`}
    style={getPieceStyle(name)}
  />
);
