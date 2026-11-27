import type { IHeading } from '@/types/content.types';

export const DOWNLOAD_HEADING: IHeading = {
  label : 'Descargar',
  title : 'Llévate a Glup',
  lead  : 'Gratis, sin cuentas y sin publicidad.',
};

export const DOWNLOAD = {
  button       : 'Descargar para Windows',
  github       : 'Ver el código en GitHub',
  stepsTitle   : 'Cómo instalarlo',
  steps        : [
    'Entra a la última versión y descarga el instalador (el archivo que termina en -setup.exe).',
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
