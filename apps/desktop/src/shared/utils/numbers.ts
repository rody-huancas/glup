// Numbers as people here read them: a point between thousands, a comma for decimals (29.684 · 36,1).
// es-PE groups with commas (29,684), so the Spanish of Spain is used.
export const NUMBER_LOCALE = 'es-ES';

const counts = new Intl.NumberFormat(NUMBER_LOCALE, { useGrouping: true, maximumFractionDigits: 0 });

export const formatCount = (value: number): string => counts.format(value);

// With at most `digits` decimals (1,5 · 36,1).
export const formatDecimal = (value: number, digits: number): string => new Intl.NumberFormat(NUMBER_LOCALE, { useGrouping: true, maximumFractionDigits: digits }).format(value);
