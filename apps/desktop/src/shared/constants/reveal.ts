import type { RevealGroup } from '@/shared/types/revealGroup';

// Marks the elements the island reveals in cascade when it opens.
export const REVEAL_ATTRIBUTE = 'data-island-reveal';

export const REVEAL_PROPS: Record<RevealGroup, Record<string, RevealGroup>> = {
  nav     : { [REVEAL_ATTRIBUTE]: 'nav' },
  heading : { [REVEAL_ATTRIBUTE]: 'heading' },
  card    : { [REVEAL_ATTRIBUTE]: 'card' },
  tool    : { [REVEAL_ATTRIBUTE]: 'tool' },
};
