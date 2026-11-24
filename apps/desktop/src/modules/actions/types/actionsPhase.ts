// order: merge order · split: how to split · pages: pick pages · image-format: PDF to images · reduce: PDF level.
// learn-model: asks to download what "Quitar fondo" needs · learning-model: downloading it · background: which background.
// protect / unlock: the password · watermark: text and look · numbering: where and how · video: what it is for ·
// id-format / id-preview: the size of the ID photo and its framing · jpg-quality: "Fotos de iPhone a JPG".
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
  | 'id-format'
  | 'id-preview'
  | 'transcribe'
  | 'jpg-quality'
  | 'working'
  | 'learning'
  | 'result';
