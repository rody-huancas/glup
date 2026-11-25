import type { RuleTemplate } from '@/modules/auto-folders/interfaces/ruleTemplate';

export const RULE_TEMPLATES: RuleTemplate[] = [
  {
    id          : 'sort-downloads',
    title       : 'Ordenar Descargas',
    description : 'Cada archivo que llega va a su carpeta: PDFs, Imágenes, Instaladores…',
    draft       : { group: 'any', extensions: '', minMb: '', tool: 'folder-sort', choice: 'type', original: 'keep', saveMode: 'same', saveFolder: null },
  },
  {
    id          : 'iphone-to-jpg',
    title       : 'Fotos de iPhone a JPG',
    description : 'Las HEIC que llegan, también en JPG para abrirlas en cualquier lado.',
    draft       : { group: 'iphone', extensions: '', minMb: '', tool: 'iphone-to-jpg', choice: 'normal', original: 'keep', saveMode: 'same', saveFolder: null },
  },
  {
    id          : 'big-videos',
    title       : 'Reducir peso de videos grandes',
    description : 'Los videos de más de 100 MB, livianos para WhatsApp, en la carpeta «Glup».',
    draft       : { group: 'videos', extensions: '', minMb: '100', tool: 'compress-video', choice: 'whatsapp', original: 'keep', saveMode: 'glup', saveFolder: null },
  },
];
