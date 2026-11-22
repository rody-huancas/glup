// order: merge order · split: how to split · pages: pick pages · image-format: PDF to images · reduce: PDF level.
export type ActionsPhase =
  | 'choosing'
  | 'formats'
  | 'order'
  | 'split'
  | 'reduce'
  | 'pages'
  | 'image-format'
  | 'working'
  | 'learning'
  | 'result';
// export type ActionsPhase = 'choosing' | 'formats' | 'working' | 'learning' | 'result';
// export type ActionsPhase = 'choosing' | 'working' | 'learning';
