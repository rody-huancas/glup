import type { IHeading, IQuestion } from '@/types/content.types';

export const FAQ_HEADING: IHeading = {
  label : 'Preguntas',
  title : 'Preguntas frecuentes',
};

export const FAQ: IQuestion[] = [
  {
    question : '¿Es gratis?',
    answer   : 'Sí, gratis y de código abierto. No tiene publicidad, cuentas ni versión de pago.',
  },
  {
    question : '¿Necesita internet?',
    answer   : 'No para trabajar. Solo la primera vez que una habilidad necesita descargar su herramienta, y para mirar si hay una versión nueva.',
  },
  {
    question : '¿Por qué descarga cosas?',
    answer   : 'Porque esas herramientas pesan mucho y no todos las usan. Así el instalador es liviano y descargas solo lo que vas a usar, siempre con permiso.',
  },
  {
    question : '¿Hay versión para Mac o Linux?',
    answer   : 'Por ahora no: Glup es para Windows 10 y 11.',
  },
  {
    question : '¿Cómo lo desinstalo?',
    answer   : 'En Configuración de Windows › Aplicaciones › Aplicaciones instaladas, busca «Glup» y elige «Desinstalar». Se quitan también sus opciones del clic derecho. Si quieres liberar antes lo que descargó, bórralo en Ajustes › Lo que aprendí.',
  },
];
