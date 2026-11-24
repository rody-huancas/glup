import type { JpgQualityOption } from '@/modules/photos/interfaces/jpgQualityOption';

// HEIC and HEIF (iPhone photos) and AVIF: Windows or FFmpeg decode them, never the webview.
export const HEIC_EXTENSIONS = ['heic', 'heif', 'hif'];
export const AVIF_EXTENSIONS = ['avif'];

// Longest side of the previews Rust makes for them (the lists show them smaller).
export const PREVIEW_SIZE = 480;

export const JPG_QUALITY_OPTIONS: JpgQualityOption[] = [
  { quality: 'normal', label: 'Normal', hint: 'Se ve igual, pesa menos' },
  { quality: 'high', label: 'Alta', hint: 'Para imprimir' },
  { quality: 'light', label: 'Liviana', hint: 'Para enviar' },
];

export const PHOTO_TEXTS = {
  qualityTitle   : '¿Qué calidad?',
  removeLocation : 'Quitar ubicación',
  // The learning step when Windows cannot open them: FFmpeg, the program of the videos.
  learnBody      : (size: string) =>
    `Tu Windows todavía no abre estas fotos. Puedo aprender a abrirlas con el mismo programa que uso para los videos: una descarga de ${size}, una sola vez. También puedes instalar desde Microsoft Store «Extensiones de imagen HEIF» y «Extensiones de vídeo HEVC» (para HEIC) o «Extensión de vídeo AV1» (para AVIF).`,
  learning       : 'Aprendiendo a abrir fotos de iPhone…',
  taskTitle      : 'Aprender a abrir fotos de iPhone',
};
