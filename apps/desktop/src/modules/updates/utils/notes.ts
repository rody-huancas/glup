// The Release notes as plain lines: no list marks, headings or empty lines.
export const noteLines = (notes: string): string[] =>
  notes
    .split(/\r?\n/)
    .map((line) => line.replace(/^\s*(?:[-*+]|\d+\.|#{1,6})\s+/, '').replace(/\*\*|__|`/g, '').trim())
    .filter(Boolean);
