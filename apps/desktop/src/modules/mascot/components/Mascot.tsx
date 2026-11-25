import { MascotEyes } from '@/modules/mascot/components/MascotEyes';
import { MascotFiles } from '@/modules/mascot/components/MascotFiles';
import { MascotLimbs } from '@/modules/mascot/components/MascotLimbs';
import { MascotMouths } from '@/modules/mascot/components/MascotMouths';
import { TRANSFORM_ORIGIN } from '@/modules/mascot/constants/animation';
import { BODY_ASSET, PEEK_ASSETS } from '@/modules/mascot/constants/assets';
import { useMascot } from '@/modules/mascot/hooks/useMascot';
import type { MascotOptions } from '@/modules/mascot/interfaces/controller';
import { getBodyAspectRatio, getPeekLayerStyle, WHOLE_STYLE } from '@/modules/mascot/utils/pieceStyle';

// The whole Glup (arms and feet behind the body, the face in front) and, for the island, the peeking
// one under the same face: --peek on an ancestor fades one into the other and moves the face along.
export const Mascot = ({ peek = false, ...props }: MascotOptions) => {
  const { face, elements, pointerHandlers } = useMascot(props);

  return (
    <div
      className="relative w-full cursor-pointer touch-none"
      style={{ aspectRatio: getBodyAspectRatio() }}
      {...pointerHandlers}
    >
      <div ref={elements.breath} className="absolute inset-0" style={{ transformOrigin: TRANSFORM_ORIGIN }}>
        <div ref={elements.act} className="absolute inset-0" style={{ transformOrigin: TRANSFORM_ORIGIN }}>
          <div className="absolute inset-0" style={peek ? WHOLE_STYLE : undefined}>
            <MascotLimbs limbs={elements.limbs} />
            <img src={BODY_ASSET} alt="Glup" draggable={false} className="pointer-events-none block h-full w-full" />
          </div>
          {peek && (
            <img
              src={PEEK_ASSETS.small}
              srcSet={`${PEEK_ASSETS.small} 1x, ${PEEK_ASSETS.large} 2x`}
              alt=""
              draggable={false}
              className="pointer-events-none absolute block"
              style={getPeekLayerStyle()}
            />
          )}
          <MascotEyes style={face.eyes} elements={elements} />
          <MascotMouths mouth={face.mouth} mouths={elements.mouths} />
          <div className="pointer-events-none absolute inset-0" style={peek ? WHOLE_STYLE : undefined}>
            <MascotFiles files={elements.files} />
          </div>
        </div>
      </div>
    </div>
  );
};
