import islandShot from '@docs/isla-recogida.webp';
import taskShot from '@docs/tarea-en-curso.webp';
import resultShot from '@docs/resultado.webp';
import type { IHeading, IStep } from '@/types/content.types';

export const STEPS_HEADING: IHeading = {
  label : 'Cómo funciona',
  title : 'Le sueltas un archivo y se lo «come»',
  lead  : 'Te muestra lo que puede hacer con él y lo hace en un momento, sin abrir ningún programa ni subir nada a internet.',
};

export const STEPS: IStep[] = [
  {
    number : '01',
    title  : 'Glup vive arriba de tu pantalla',
    body   : 'Es una pastilla pequeña en el borde de arriba. Pasas el cursor y se abre. También puede vivir en otro borde o esquina, o ser una burbuja que dejas donde quieras.',
    image  : islandShot,
    alt    : 'Glup recogido en el borde de arriba de la pantalla',
    window : 'arriba de tu pantalla',
  },
  {
    number : '02',
    title  : 'Le sueltas un archivo',
    body   : 'Se lo come y te muestra lo que puede hacer con él. También lo encuentras con el clic derecho del Explorador de Windows. La tarea sigue aunque cierres el panel.',
    image  : taskShot,
    alt    : 'Glup reduciendo el peso de unas fotos, con su barra de avance',
    window : 'trabajando…',
  },
  {
    number : '03',
    title  : 'Te lo devuelve listo',
    body   : 'Te avisa al terminar y guarda el resultado como un archivo nuevo, sin tocar tu original. Todo queda en el Historial, desde donde puedes abrirlo o deshacer lo que se puede deshacer.',
    image  : resultShot,
    alt    : 'El resultado: listo, 12 imágenes de 49,2 MB a 14,4 MB, con el botón Ver en carpeta',
    window : 'listo',
  },
];
