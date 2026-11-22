// order: merge order · split: how to split · pages: pick pages · image-format: PDF to images · reduce: PDF level.
// learn-model: asks to download what "Quitar fondo" needs · learning-model: downloading it · background: which background.
export type ActionsPhase =
  | 'choosing'
  | 'formats'
  | 'order'
  | 'split'
  | 'reduce'
  | 'pages'
  | 'image-format'
  | 'learn-model'
  | 'learning-model'
  | 'background'
  | 'working'
  | 'learning'
  | 'result';
// export type ActionsPhase = 'choosing' | 'formats' | 'working' | 'learning' | 'result';
// export type ActionsPhase = 'choosing' | 'working' | 'learning';
