const pad = (value: number): string => String(value).padStart(2, '0');

// dd/mm/aaaa
export const formatDate = (date: Date): string => `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}`;
