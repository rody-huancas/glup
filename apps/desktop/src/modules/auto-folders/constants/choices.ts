import type { ToolChoice } from '@/modules/auto-folders/interfaces/toolChoice';
import type { AutoToolId } from '@/modules/auto-folders/types/autoToolId';
import type { FileGroup } from '@/modules/auto-folders/types/fileGroup';

// The file types each action can work on (the same as Rust's AutoTool.accepts, plus what fits in them).
export const TOOL_GROUPS: Record<AutoToolId, FileGroup[]> = {
  'folder-sort'       : ['any', 'photos', 'iphone', 'pdf', 'videos', 'audios', 'custom'],
  'iphone-to-jpg'     : ['iphone'],
  'convert-image'     : ['photos', 'iphone', 'custom'],
  'compress-image'    : ['photos', 'iphone', 'custom'],
  'compress-pdf'      : ['pdf'],
  'compress-video'    : ['videos'],
  'transcribe'        : ['audios', 'videos'],
  'remove-background' : ['photos', 'iphone', 'custom'],
};

// The option each action keeps in the rule (the first one is the default); none for the others.
export const TOOL_CHOICES: Partial<Record<AutoToolId, ToolChoice>> = {
  'folder-sort'       : { label: 'Cómo', options: [{ value: 'type', label: 'por tipo' }, { value: 'date', label: 'por año y mes' }] },
  'iphone-to-jpg'     : { label: 'Calidad', options: [{ value: 'normal', label: 'calidad normal' }, { value: 'high', label: 'calidad alta' }, { value: 'light', label: 'liviana' }] },
  'convert-image'     : { label: 'A qué', options: [{ value: 'webp', label: 'a WebP' }, { value: 'jpg', label: 'a JPG' }, { value: 'png', label: 'a PNG' }, { value: 'avif', label: 'a AVIF' }] },
  'compress-pdf'      : { label: 'Cuánto', options: [{ value: 'normal', label: 'sin que se note' }, { value: 'maximum', label: 'al máximo' }] },
  'compress-video'    : { label: 'Para qué', options: [{ value: 'whatsapp', label: 'para WhatsApp' }, { value: 'email', label: 'para correo' }, { value: 'lightest', label: 'lo más liviano' }] },
  'transcribe'        : { label: 'Cómo', options: [{ value: 'fast', label: 'rápido' }, { value: 'precise', label: 'más preciso' }] },
  'remove-background' : { label: 'Fondo', options: [{ value: 'transparent', label: 'transparente' }, { value: 'white', label: 'blanco' }] },
};

// The order of the action list.
export const AUTO_TOOL_ORDER: AutoToolId[] = ['folder-sort', 'iphone-to-jpg', 'convert-image', 'compress-image', 'compress-pdf', 'compress-video', 'transcribe', 'remove-background'];
