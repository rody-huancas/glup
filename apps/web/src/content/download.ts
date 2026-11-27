import type { IHeading } from '@/types/content.types';

export const DOWNLOAD_HEADING: IHeading = {
  label : 'Descargar',
  title : 'Llévate a Glup',
  lead  : 'Gratis, sin cuentas y sin publicidad.',
};

// The installer's size, as GitHub shows it in the Release: updated with each version.
const INSTALLER_SIZE = '21 MB';

export const DOWNLOAD = {
  button       : 'Descargar para Windows',
  note         : (version: string) => `Versión ${version} · ${INSTALLER_SIZE} · Windows 10 y 11`,
  allVersions  : 'Ver todas las versiones',
  github       : 'Ver el código en GitHub',
  stepsTitle   : 'Cómo instalarlo',
  steps        : [
    'Toca «Descargar para Windows»: se baja el instalador, Glup-Windows.exe.',
    'Ábrelo y sigue los pasos. Glup aparece arriba de tu pantalla y en la bandeja, junto al reloj.',
  ],
  needsTitle   : 'Requisitos',
  needs        : 'Windows 10 u 11 de 64 bits.',
  warning      : {
    window : 'windows protegió tu pc',
    title  : '¿Sale una ventana azul que dice «Windows protegió tu PC»?',
    body   : 'Aparece con los programas nuevos que todavía no son conocidos por Windows.',
    steps  : ['Toca «Más información».', 'Después, «Ejecutar de todas formas».'],
    trust  : 'El instalador se arma solo en GitHub a partir del código de Glup, que puedes revisar.',
  },
};
