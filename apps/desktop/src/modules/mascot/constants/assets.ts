import body from '@/modules/mascot/assets/body.png';
import eyeHappyLeft from '@/modules/mascot/assets/eye-happy-left.png';
import eyeHappyRight from '@/modules/mascot/assets/eye-happy-right.png';
import eyeLeft from '@/modules/mascot/assets/eye-left.png';
import eyeRight from '@/modules/mascot/assets/eye-right.png';
import fileImage from '@/modules/mascot/assets/file-image.png';
import filePdf from '@/modules/mascot/assets/file-pdf.png';
import mouthLine from '@/modules/mascot/assets/mouth-line.png';
import mouthO from '@/modules/mascot/assets/mouth-o.png';
import mouthOpen from '@/modules/mascot/assets/mouth-open.png';
import mouthSmile from '@/modules/mascot/assets/mouth-smile.png';
import mouthWavy from '@/modules/mascot/assets/mouth-wavy.png';
import type { PieceName } from '@/modules/mascot/types/pieceName';

export const BODY_ASSET = body;

export const PIECE_ASSETS: Record<PieceName, string> = {
  'eye-left'        : eyeLeft,
  'eye-right'       : eyeRight,
  'eye-happy-left'  : eyeHappyLeft,
  'eye-happy-right' : eyeHappyRight,
  'mouth-smile'     : mouthSmile,
  'mouth-open'      : mouthOpen,
  'mouth-o'         : mouthO,
  'mouth-line'      : mouthLine,
  'mouth-wavy'      : mouthWavy,
  'file-pdf'        : filePdf,
  'file-image'      : fileImage,
};
