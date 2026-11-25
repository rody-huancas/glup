interface Dated {
  date: string;
}

// Entries saved after the Historial was last opened.
export const countNewEntries = (entries: Dated[], seenAt: number | null): number =>
  seenAt === null ? 0 : entries.filter((entry) => Date.parse(entry.date) > seenAt).length;

// "3", or "99+" for many.
export const countLabel = (count: number): string => (count > 99 ? '99+' : String(count));
