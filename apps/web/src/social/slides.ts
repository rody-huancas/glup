// The texts of the social pictures (src/social): few, large and plain, to be read on a phone. The skills
// named here are the app's own (tools.json), the promises are the landing's.
export const SOCIAL = {
  site      : 'glup.novtiq.dev',
  repo      : 'github.com/rody-huancas/glup',
  total     : 8,
  cover     : {
    label    : 'Mascota de escritorio para Windows',
    phrase   : 'Una mascota que vive arriba de tu pantalla y te ayuda con tus archivos',
    bottom   : ['Gratis', 'Windows', 'glup.novtiq.dev'],
    munch    : 'ñam',
  },
  problem   : {
    title    : '¿Cuántas páginas raras usaste para pasar un PDF a JPG?',
    windows  : [
      { title: 'convertidor-gratis', lines: ['Sube tu archivo', 'Espera 30 segundos…'] },
      { title: 'pdf-a-jpg-online', lines: ['Regístrate para descargar', 'Máximo 2 páginas'] },
      { title: 'convierte-rapido', lines: ['Mira este anuncio', 'Tu archivo está en la cola'] },
      { title: 'otro-convertidor', lines: ['Instala nuestra extensión', 'Error, inténtalo otra vez'] },
    ],
    ad       : 'ANUNCIO',
    answer   : 'Con Glup lo sueltas y listo. Sin subir nada.',
  },
  how       : {
    title    : 'Cómo funciona',
    window   : 'arriba de tu pantalla',
    alt      : 'Glup abierto arriba de un escritorio de ejemplo, con su Inicio',
    steps    : ['Vive arriba de tu pantalla', 'Le sueltas un archivo', 'Te lo devuelve listo'],
  },
  imagesPdf : {
    title    : 'Fotos y PDF, sin páginas web',
    windows  : ['imágenes · listo', 'familia · pdf'],
    alts     : ['Reducir peso: listo, 12 imágenes de 49,2 MB a 14,4 MB', 'La familia PDF con sus herramientas'],
    images   : ['Convertir', 'Fotos de iPhone a JPG', 'Reducir peso', 'Quitar fondo'],
    pdf      : ['Unir', 'Separar', 'Firmar', 'Escanear documento'],
  },
  media     : {
    title    : 'Pasa una nota de voz a texto en segundos',
    window   : 'subtítulos',
    alt      : 'Subtítulos: el video y las frases para revisar',
    skills   : ['Pasar audio a texto', 'Subtítulos', 'Reducir peso de video', 'Sacar el audio'],
  },
  pc        : {
    title    : 'Haz espacio en tu PC',
    lead     : 'Mira qué ocupa tu disco y quita las copias repetidas.',
    windows  : ['qué ocupa espacio', 'archivos repetidos'],
    alts     : ['Qué ocupa espacio: el mapa de colores de una carpeta', 'Archivos repetidos: grupos de copias para quitar'],
  },
  privacy   : {
    title    : 'Todo se queda en tu PC',
  },
  close     : {
    title    : 'Gratis y de código abierto',
    download : 'Descárgalo en glup.novtiq.dev',
  },
  link      : {
    phrase   : 'Tus fotos, PDF, audios y videos, sin subir nada a internet',
  },
};

// The pages and the size each one is taken at (scripts/social-shots.mjs keeps the same list).
export const SOCIAL_PAGES = [
  'portada', 'problema', 'como-funciona', 'imagenes-pdf', 'audio-video', 'tu-pc', 'privacidad', 'cierre', 'post', 'enlace',
] as const;

export type SocialPage = (typeof SOCIAL_PAGES)[number];
