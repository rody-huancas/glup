// Learning to work with videos (the one-time download) and Ajustes › "Lo que aprendí".
export const VIDEO_TOOL_TEXTS = {
  learnBody  : (size: string) => `Para trabajar con videos necesito aprender algo nuevo. Es una descarga de ${size}, una sola vez. Tus videos nunca salen de tu PC.`,
  learning   : 'Aprendiendo a trabajar con videos…',
  taskTitle  : 'Aprender a trabajar con videos',
  learned    : (size: string) => `Videos y fotos de iPhone · ${size}`,
  deleteBody : 'Libero ese espacio. Si vuelves a reducir un video (o a abrir una foto que tu Windows no abre), te pediré descargarlo otra vez.',
};

export const VIDEO_TEXTS = {
  title       : '¿Para qué es?',
  whatsapp    : 'Para WhatsApp',
  whatsappTip : 'Hasta 720p, se ve bien',
  email       : 'Para correo',
  emailTip    : 'Que pese menos de 25 MB',
  lightest    : 'Lo más liviano',
  lightestTip : '480p, pesa muy poco',
  targetLabel : 'Necesito que pese menos de',
  targetField : 'Peso máximo en megas',
  targetUnit  : 'MB',
  targetGo    : 'Reducir',
  reading     : 'Mirando el video…',
  tooLong     : (size: string) => `Es muy largo para que pese menos de 25 MB; quedará en unos ${size}.`,
  tooLongFor  : (limit: string, size: string) => `Es muy largo para que pese menos de ${limit}; quedará en unos ${size}.`,
  severalLong : (count: number) => `${count} de los videos son muy largos para ese peso: quedarán un poco por encima.`,
  estimate    : (size: string) => `Quedará en unos ${size}`,
};
