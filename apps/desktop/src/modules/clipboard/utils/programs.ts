// "C:\Program Files\Banco\Banco.exe" → "Banco.exe": the list of Ajustes keeps file names, as Rust compares them.
export const programFile = (path: string): string => path.split(/[\\/]/).filter(Boolean).pop() ?? path;

// Once each, whatever the capitals, in alphabetical order.
export const addProgram = (list: string[], name: string): string[] => {
  if (!name || list.some((program) => program.toLowerCase() === name.toLowerCase())) return list;
  return [...list, name].sort((a, b) => a.localeCompare(b, 'es', { sensitivity: 'base' }));
};

export const removeProgram = (list: string[], name: string): string[] => list.filter((program) => program !== name);
