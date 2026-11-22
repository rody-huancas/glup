import type { ReactNode, RefObject } from 'react';
import { getFlyerStyle } from '@/modules/island/utils/islandStyles';

interface IslandMascotFlyerProps {
  liftRef   : RefObject<HTMLDivElement | null>;
  flyerRef  : RefObject<HTMLDivElement | null>;
  squashRef : RefObject<HTMLDivElement | null>;
  children  : ReactNode;
}

// The only Glup of the island. Lift moves it in screen pixels (arc, hops), flyer travels with Flip,
// and squash scales and tilts it from its feet.
export const IslandMascotFlyer = ({ liftRef, flyerRef, squashRef, children }: IslandMascotFlyerProps) => (
  <div ref={liftRef} className="absolute left-1/2 top-0 z-20" style={getFlyerStyle()}>
    <div ref={flyerRef}>
      <div ref={squashRef} className="origin-bottom">
        {children}
      </div>
    </div>
  </div>
);

// export const IslandMascotFlyer = ({ flyerRef, squashRef, children }: IslandMascotFlyerProps) => (
//   <div ref={flyerRef} className="absolute left-1/2 top-0 z-20" style={getFlyerStyle()}>
//     <div ref={squashRef} className="origin-bottom">
//       {children}
//     </div>
//   </div>
// );
