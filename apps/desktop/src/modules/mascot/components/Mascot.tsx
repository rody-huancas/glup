import { MascotEyes } from '@/modules/mascot/components/MascotEyes';
import { MascotFiles } from '@/modules/mascot/components/MascotFiles';
import { MascotMouths } from '@/modules/mascot/components/MascotMouths';
import { TRANSFORM_ORIGIN } from '@/modules/mascot/constants/animation';
import { BODY_ASSET } from '@/modules/mascot/constants/assets';
import { useMascot } from '@/modules/mascot/hooks/useMascot';
import { getBodyAspectRatio } from '@/modules/mascot/utils/pieceStyle';

export const Mascot = () => {
  const { face, elements, pointerHandlers } = useMascot();

  return (
    <div
      className="relative w-[88%] cursor-pointer touch-none"
      style={{ aspectRatio: getBodyAspectRatio() }}
      {...pointerHandlers}
    >
      <div ref={elements.breath} className="absolute inset-0" style={{ transformOrigin: TRANSFORM_ORIGIN }}>
        <div ref={elements.act} className="absolute inset-0" style={{ transformOrigin: TRANSFORM_ORIGIN }}>
          <img src={BODY_ASSET} alt="Glup" draggable={false} className="pointer-events-none block h-full w-full" />
          <MascotEyes style={face.eyes} elements={elements} />
          <MascotMouths mouth={face.mouth} mouths={elements.mouths} />
          <MascotFiles files={elements.files} />
        </div>
      </div>
    </div>
  );
};
