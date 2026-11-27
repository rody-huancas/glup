import type { IHeading } from '@/types/content.types';

// The ideas form lives in Tally (no server of ours): the embed, the form on its own page, and the public
// place to talk about ideas.
export const TALLY_EMBED_URL       = 'https://tally.so/embed/peO7oZ?alignLeft=1&hideTitle=1&transparentBackground=1&dynamicHeight=1';
export const TALLY_FORM_URL        = 'https://tally.so/r/peO7oZ';
export const TALLY_SCRIPT_URL      = 'https://tally.so/widgets/embed.js';
export const IDEAS_DISCUSSIONS_URL = 'https://github.com/rody-huancas/glup/discussions/categories/ideas';

export const IDEAS_HEADING: IHeading = {
  label : 'Ideas',
  title : 'Glup sigue creciendo',
  lead  : 'Estamos trabajando en más cosas para Glup. Cuéntanos qué te gustaría que haga y lo tomamos en cuenta.',
};

export const IDEAS = {
  soon       : { tag: 'Pronto', text: 'Una versión de Glup pensada para desarrolladores.' },
  window     : 'tu idea para glup',
  formTitle  : 'Propón una idea para Glup',
  formHeight : 581,
  openForm   : { text: '¿No ves el formulario?', link: 'Ábrelo aquí' },
  discuss    : { text: '¿Prefieres comentarlo en público?', link: 'Escríbenos en GitHub' },
};
