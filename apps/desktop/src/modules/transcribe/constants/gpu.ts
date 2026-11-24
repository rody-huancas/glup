import type { GpuMode } from '@/modules/transcribe/types/gpuMode';

export const GPU_TEXTS = {
  section  : 'Pasar audio a texto',
  title    : 'Usar la tarjeta de video',
  hint     : 'Con ella escucho varias veces más rápido. Si falla, sigo con el procesador sin perder lo hecho.',
  checking : 'Mirando qué tarjeta de video tienes…',
  usingGpu : (name: string) => `Escucho con la tarjeta de video: ${name}.`,
  chosen   : 'Escucho con el procesador, como elegiste.',
  noCard   : 'Escucho con el procesador: no encontré una tarjeta de video que me sirva.',
  blocked  : (name: string) =>
    name ? `Escucho con el procesador: ${name} falló la última vez. La vuelvo a probar cuando se actualice su controlador.` : 'Escucho con el procesador: la tarjeta de video falló la última vez. La vuelvo a probar cuando se actualice su controlador.',
};

export const GPU_MODE_TEXTS: Record<GpuMode, { label: string; hint: string }> = {
  auto  : { label: 'Automático', hint: 'Si hay una que sirva' },
  never : { label: 'Nunca', hint: 'Siempre el procesador' },
};
