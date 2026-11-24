// Body size plus the corner radii, in the edge's terms (width along it, height into the screen); the ears
// sit outside the body, one at each end.
export interface IslandShape {
  width        : number;
  height       : number;
  earRadius    : number;
  bottomRadius : number;
  // How far its middle sits from the pill's, along the edge (the open panel slides to stay on screen).
  shift        : number;
}

export interface ShapeSize {
  width  : number;
  height : number;
}
