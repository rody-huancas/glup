import type { ISectionTop, SectionId } from '@/types/section.types';

// The section being read: the last one whose top has passed the reading line (a share of the window
// from the top). Before the first, the first.
export const activeSection = (sections: ISectionTop[], line: number): SectionId | null => {
  if (sections.length === 0) return null;

  const passed = sections.filter((section) => section.top <= line);

  return passed.length > 0 ? passed[passed.length - 1].id : sections[0].id;
};
