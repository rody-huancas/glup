import type { Corner } from '@/modules/sign/types/corner';

// Moving the whole element, or resizing it from one corner.
export type DragMode = { kind: 'move' } | { kind: 'resize'; corner: Corner };
