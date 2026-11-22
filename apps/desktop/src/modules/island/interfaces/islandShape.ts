// Body size plus the corner radii; the ears sit outside the body, one on each side.
export interface IslandShape {
  width        : number;
  height       : number;
  earRadius    : number;
  bottomRadius : number;
}

export interface ShapeSize {
  width  : number;
  height : number;
}
