import type { ReactNode, RefObject } from 'react';
import { getFlyerStyle } from '@/modules/island/utils/islandStyles';
import { cx } from '@/shared/utils/classNames';

interface IslandMascotFlyerProps {
  liftRef   : RefObject<HTMLDivElement | null>;
  flyerRef  : RefObject<HTMLDivElement | null>;
  squashRef : RefObject<HTMLDivElement | null>;
  children  : ReactNode;
  // Out of sight while signing (the sidebar it sits on is hidden); GSAP never touches visibility.
  hidden?   : boolean;
}

// The only Glup of the island. Lift moves it in screen pixels (arc, hops), flyer travels with Flip,
// and squash scales and tilts it from its feet.
export const IslandMascotFlyer = ({ liftRef, flyerRef, squashRef, children, hidden = false }: IslandMascotFlyerProps) => (
  <div ref={liftRef} className={cx('absolute left-1/2 top-0 z-20', hidden && 'invisible')} style={getFlyerStyle()}>
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
