import type { UsageLevel } from '@/modules/performance/types/usageLevel';

export const PERFORMANCE_TEXTS = {
  title        : 'Rendimiento',
  subtitle     : 'Qué está usando tu PC ahora, en palabras simples',
  processor    : 'Procesador',
  memory       : 'Memoria',
  disk         : 'Disco',
  diskUnknown  : 'Windows no me dice cuánto trabaja el disco',
  memoryOf     : (used: string, total: string) => `${used} de ${total}`,
  spaceTitle   : 'Espacio en tus discos',
  spaceFree    : (free: string, total: string) => `${free} libres de ${total}`,
  lowSpace     : 'Queda poco espacio',
  veryLowSpace : 'Casi no queda espacio',
  toCleanup    : 'Hacer espacio',
  batteryTitle : 'Batería',
  charging     : 'Cargando',
  plugged      : 'Enchufada',
  onBattery    : 'Con batería',
  health       : (percent: number) => `Rinde el ${percent} % de cuando era nueva`,
  worn         : 'Ya no dura como nueva: es normal con los años',
  noHealth     : 'Windows no dice cómo está su salud',
  uptime       : (text: string) => `Encendida hace ${text}`,
  restart      : 'Hace varios días que no reinicias. Reiniciar de vez en cuando deja a Windows como nuevo.',
  topTitle     : 'Lo que más está usando',
  topHint      : 'Por app, con todos sus procesos. Se actualiza cada 2 segundos.',
  processes    : (count: number) => (count === 1 ? '1 proceso' : `${count} procesos`),
  cpuShare     : (percent: string) => `${percent} % del procesador`,
  close        : 'Cerrar',
  closeLabel   : (name: string) => `Cerrar ${name}`,
  protected    : 'Es parte de Windows',
  glup         : 'Soy yo',
  startTitle   : 'Al encender la PC',
  startHint    : 'Lo que arranca solo con Windows. Apagarlo aquí es lo mismo que en el Administrador de tareas, y se puede volver a encender.',
  startEmpty   : 'Nada arranca solo con Windows.',
  everyone     : 'Para todos los usuarios: solo un administrador lo cambia',
  startError   : 'No pude cambiarlo',
  loadError    : 'No pude leer cómo está tu PC',
};

export const CLOSE_TEXTS = {
  title      : (name: string) => `¿Cierro ${name}?`,
  body       : 'Puedes perder lo que no guardaste. Primero le pido que se cierre, como con su X.',
  confirm    : 'Cerrar',
  keep       : 'No, dejarla',
  closing    : (name: string) => `Pidiéndole a ${name} que se cierre…`,
  stuckTitle : (name: string) => `${name} no se cerró`,
  stuck      : 'Puede que te esté preguntando si guardas algo: mira su ventana. Si no responde, puedo forzarla, pero se pierde lo que no guardaste.',
  noWindow   : 'No tiene ventana a la que pedirle que se cierre. Solo puedo forzarla, y se pierde lo que no guardaste.',
  force      : 'Forzar',
  forcing    : 'Forzando…',
};

export const LEVEL_TEXTS: Record<'cpu' | 'memory' | 'disk', Record<UsageLevel, string>> = {
  cpu    : { calm: 'Tu PC está tranquila', working: 'Tu PC está trabajando', busy: 'El procesador está muy ocupado', full: 'El procesador está al máximo' },
  memory : { calm: 'Hay memoria de sobra', working: 'La memoria está bien', busy: 'La memoria está bastante usada', full: 'La memoria está casi llena' },
  disk   : { calm: 'El disco está tranquilo', working: 'El disco está trabajando', busy: 'El disco está muy ocupado', full: 'El disco está al máximo' },
};

export const UPTIME_TEXTS = {
  minutes : (count: number) => (count === 1 ? '1 minuto' : `${count} minutos`),
  hours   : (count: number) => (count === 1 ? '1 hora' : `${count} horas`),
  days    : (count: number) => (count === 1 ? '1 día' : `${count} días`),
};
