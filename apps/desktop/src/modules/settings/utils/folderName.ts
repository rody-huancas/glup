// Last segment of a folder path, for compact labels.
export const getFolderName = (path: string): string => path.replace(/[\\/]+$/, '').split(/[\\/]/).pop() ?? path;
