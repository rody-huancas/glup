import { MascotEyes } from '@/modules/mascot/components/MascotEyes';
import { MascotFiles } from '@/modules/mascot/components/MascotFiles';
import { MascotLimbs } from '@/modules/mascot/components/MascotLimbs';
import { MascotMouths } from '@/modules/mascot/components/MascotMouths';
import { TRANSFORM_ORIGIN } from '@/modules/mascot/constants/animation';
import { BODY_ASSET } from '@/modules/mascot/constants/assets';
import { useMascot } from '@/modules/mascot/hooks/useMascot';
import type { MascotOptions } from '@/modules/mascot/interfaces/controller';
import { getBodyAspectRatio } from '@/modules/mascot/utils/pieceStyle';

export const Mascot = (props: MascotOptions) => {
  const { face, elements, pointerHandlers } = useMascot(props);

  return (
    <div
      className="relative w-full cursor-pointer touch-none"
      style={{ aspectRatio: getBodyAspectRatio() }}
      {...pointerHandlers}
    >
      <div ref={elements.breath} className="absolute inset-0" style={{ transformOrigin: TRANSFORM_ORIGIN }}>
        <div ref={elements.act} className="absolute inset-0" style={{ transformOrigin: TRANSFORM_ORIGIN }}>
          <MascotLimbs limbs={elements.limbs} />
          <img src={BODY_ASSET} alt="Glup" draggable={false} className="pointer-events-none block h-full w-full" />
          <MascotEyes style={face.eyes} elements={elements} />
          <MascotMouths mouth={face.mouth} mouths={elements.mouths} />
          <MascotFiles files={elements.files} />
        </div>
      </div>
    </div>
  );
};
