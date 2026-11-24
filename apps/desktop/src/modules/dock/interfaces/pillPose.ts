// Glup in a pill: its width as a share of its slot and where it sits. peek: px from the pill's top (a
// lying pill shows only its head, the silhouette crops it); null: its face in the middle, lift being the
// share of Glup's height above the pill's middle.
export interface PillPose {
  scale : number;
  peek  : number | null;
  lift  : number;
}
