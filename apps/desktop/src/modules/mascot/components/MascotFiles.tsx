import { MascotPiece } from '@/modules/mascot/components/MascotPiece';
import { FILE_KINDS, FILE_PIECES } from '@/modules/mascot/constants/files';
import type { MascotElements } from '@/modules/mascot/interfaces/elements';

interface MascotFilesProps {
  files: MascotElements['files'];
}

export const MascotFiles = ({ files }: MascotFilesProps) => (
  <>
    {FILE_KINDS.map((kind) => (
      <MascotPiece key={kind} name={FILE_PIECES[kind]} imageRef={files[kind]} className="opacity-0" />
    ))}
  </>
);
