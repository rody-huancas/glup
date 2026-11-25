import { useContext } from 'react';
import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { REVEAL_PROPS } from '@/shared/constants/reveal';
import { PanelStripContext } from '@/shared/contexts/panelStrip';

interface PageHeaderProps {
  title    : string;
  subtitle : string;
  // The way to where the screen is («Tu carpeta › Desktop · 36,1 GB»), beside the title.
  crumbs?  : ReactNode;
}

// The title (and the way) go up to the strip of the panel, beside Fijar and Recoger; the line that says
// what the screen does stays at its top. Outside the panel both stay here.
export const PageHeader = ({ title, subtitle, crumbs }: PageHeaderProps) => {
  const strip = useContext(PanelStripContext);
  const head  = (
    <div className="flex min-w-0 items-baseline gap-3">
      <h1 {...REVEAL_PROPS.heading} className="shrink-0 text-lg leading-tight font-bold tracking-[-0.01em] text-text">{title}</h1>
      {crumbs}
    </div>
  );

  return (
    <header>
      {strip ? createPortal(head, strip) : head}
      <p {...REVEAL_PROPS.heading} className="text-sm text-muted">{subtitle}</p>
    </header>
  );
};
