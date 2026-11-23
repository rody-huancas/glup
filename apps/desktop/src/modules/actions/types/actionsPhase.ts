// order: merge order · split: how to split · pages: pick pages · image-format: PDF to images · reduce: PDF level.
// learn-model: asks to download what "Quitar fondo" needs · learning-model: downloading it · background: which background.
// protect / unlock: the password · watermark: text and look · numbering: where and how · video: what it is for.
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
  | 'protect'
  | 'unlock'
  | 'watermark'
  | 'numbering'
  | 'video'
  | 'working'
  | 'learning'
  | 'result';
// export type ActionsPhase = 'choosing' | 'formats' | 'working' | 'learning' | 'result';
// export type ActionsPhase = 'choosing' | 'working' | 'learning';
