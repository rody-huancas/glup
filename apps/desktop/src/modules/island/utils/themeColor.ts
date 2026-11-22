// Resolves a @theme color token so it can be used inside Web Animations keyframes.
export const getThemeColor = (token: string): string => {
  if (token === 'transparent') return token;

  const value = getComputedStyle(document.documentElement).getPropertyValue(`--color-${token}`).trim();
  return value || 'transparent';
};
