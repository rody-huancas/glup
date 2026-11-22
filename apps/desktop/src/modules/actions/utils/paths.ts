// Last segment of a Windows or POSIX path.
export const getFileName = (path: string): string => path.split(/[\\/]/).pop() ?? path;

export const getExtension = (path: string): string => {
  const name = getFileName(path);
  const dot  = name.lastIndexOf('.');

  return dot === -1 ? '' : name.slice(dot + 1).toLowerCase();
};
