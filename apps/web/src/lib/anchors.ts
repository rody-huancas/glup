import type { SectionId } from '@/types/section.types';

// Where an in-page link goes: «top» for the start (an empty # or the first section), the id of the
// element otherwise; null for links that are not in-page.
export const anchorTarget = (href: string, first: SectionId): string | 'top' | null => {
  if (!href.startsWith('#')) return null;

  const id = decodeURIComponent(href.slice(1));
  return id === '' || id === first ? 'top' : id;
};
