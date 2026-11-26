// A long name cut in the middle, so its end (the extension, the number) stays: «WhatsApp Vid…05.mp4».
export const middleEllipsis = (name: string, max: number): string => {
  if (name.length <= max) return name;
  const tail = Math.min(9, Math.floor((max - 1) / 2));
  return `${name.slice(0, max - 1 - tail).trimEnd()}…${name.slice(-tail)}`;
};
