let context: CanvasRenderingContext2D | null = null;

// Width of a text in bold Helvetica (or Arial, with the same widths) at a font size of 1.
export const boldTextUnit = (text: string): number => {
  context ??= document.createElement('canvas').getContext('2d');
  if (!context) return text.length * 0.66;

  context.font = 'bold 100px Helvetica, Arial, sans-serif';
  return context.measureText(text).width / 100;
};
