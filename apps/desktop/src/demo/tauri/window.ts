const position = { x: 0, y: 0 };

export const getCurrentWindow = () => ({
  label       : 'island',
  innerPosition : () => Promise.resolve(position),
  onMoved     : () => Promise.resolve(() => undefined),
});
