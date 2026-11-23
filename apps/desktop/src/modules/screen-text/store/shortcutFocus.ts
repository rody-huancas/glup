// "Cambiar" on the card in Herramientas: Ajustes opens with the shortcut setting in view and focused.
let requested = false;

export const requestShortcutFocus = () => {
  requested = true;
};

// True once per request.
export const takeShortcutFocus = (): boolean => {
  const was = requested;
  requested = false;
  return was;
};
