// The classes of a family's colors, written whole so Tailwind finds them (tokens in index.css).
export interface FamilyStyle {
  // The color as text, as a fill, as a soft border and as the border on hover.
  text   : string;
  fill   : string;
  border : string;
  edge   : string;
  // Its dark fill (cards), the deeper one on hover, and the ink on the color.
  dark   : string;
  hover  : string;
  deep   : string;
  ink    : string;
  // The active item of the side bar while on this family's screen.
  nav    : string;
}
