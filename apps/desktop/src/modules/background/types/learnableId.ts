// background: the "Quitar fondo" model · video: FFmpeg, for "Reducir peso" of videos.
// transcribe-*: Whisper for "Pasar audio a texto", one per level. photos: the same FFmpeg, asked for when
// Windows cannot open a HEIC or AVIF (not listed apart in Ajustes: it is "Videos").
// upscale-*: Real-ESRGAN for "Mejorar calidad", one per level.
export type LearnableId = 'background' | 'video' | 'photos' | 'transcribe-fast' | 'transcribe-precise' | 'upscale-fast' | 'upscale-detail';
