import { createContext } from 'react';

// The strip at the top of the panel, beside Fijar and Recoger: where a screen puts its title and its way
// (null outside the panel).
export const PanelStripContext = createContext<HTMLElement | null>(null);
