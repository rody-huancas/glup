// Same minimum as Rust (services/pdf/protect.rs).
export const MIN_PASSWORD = 4;

export const PROTECT_TEXTS = {
  title       : 'Pon una contraseña',
  field       : 'Contraseña',
  confirm     : 'Repítela',
  hint        : 'Si la olvidas, no hay forma de recuperarla.',
  show        : 'Mostrar contraseña',
  hide        : 'Ocultar contraseña',
  button      : 'Proteger PDF',
  tooShort    : `Tiene que tener al menos ${MIN_PASSWORD} caracteres`,
  different   : 'Las dos no coinciden',
  unlockTitle : 'Escribe la contraseña',
  unlockHint  : 'Solo la quito si la sabes: no la adivino ni la fuerzo.',
  unlock      : 'Quitar contraseña',
  checking    : 'Revisando…',
  wrong       : 'Esa no es la contraseña',
};
