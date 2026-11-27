import type { IDownloadRow, IHeading } from '@/types/content.types';

export const PRIVACY_HEADING: IHeading = {
  label : 'Privacidad',
  title : 'Todo se queda en tu PC',
  lead  : 'Glup nunca sube tus archivos ni nada tuyo a internet: todo se hace en tu computadora.',
};

export const PRIVACY_PROMISES = [
  { title: 'No sube nada', body: 'Tus fotos, PDF, audios y videos nunca salen de tu computadora.' },
  { title: 'No toca tus originales', body: 'Lo que hace lo guarda como un archivo nuevo, y lo que mandas a borrar va a la papelera.' },
  { title: 'Te pregunta antes', body: 'Si una habilidad necesita descargar algo, te dice cuánto pesa y que es una sola vez. Puedes decir «Ahora no».' },
];

export const PRIVACY_DOWNLOADS = {
  title   : 'Lo que se descarga solo si hace falta',
  body    : 'Algunas habilidades necesitan una herramienta que no viene en el instalador, para que este sea liviano. Se descarga de una dirección fija, se comprueba que llegó entera y se guarda en la carpeta de Glup. En Ajustes › Lo que aprendí ves cuánto ocupa y puedes borrarla.',
  columns : { what: 'Qué se descarga', forUse: 'Para qué', weight: 'Peso' },
  window  : 'lo-que-aprendi',
};

export const PRIVACY_ROWS: IDownloadRow[] = [
  { what: 'FFmpeg', forUse: 'Videos, audios y las fotos de iPhone que Windows no abre', weight: 'unos 52 MB' },
  { what: 'Modelo de «Quitar fondo»', forUse: 'Quitar fondo y Foto tamaño carnet', weight: '109 MB' },
  { what: 'Modelo para escuchar (rápido o más preciso)', forUse: 'Pasar audio a texto y Subtítulos', weight: '181 MB o 514 MB' },
  { what: 'Modelo para agrandar (rápido o con más detalle)', forUse: 'Mejorar calidad', weight: '4,6 MB o 64 MB' },
];

export const PRIVACY_UPDATES = 'Además de eso, lo único que hace con internet es mirar, en su propio repositorio, si hay una versión nueva. Solo se instala cuando tocas «Actualizar ahora».';
