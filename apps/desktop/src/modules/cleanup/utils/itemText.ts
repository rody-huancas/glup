const DATE_FORMAT = new Intl.DateTimeFormat('es', { day: '2-digit', month: '2-digit', year: 'numeric' });

export const fileNameOf = (path: string): string => path.split(/[\\/]/).pop() ?? path;

export const folderOf = (path: string): string => path.split(/[\\/]/).slice(0, -1).join('\\');

export const formatItemDate = (millis: number): string => (millis > 0 ? DATE_FORMAT.format(new Date(millis)) : '');
