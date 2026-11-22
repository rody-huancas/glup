import { REVEAL_PROPS } from '@/shared/constants/reveal';

interface PageHeaderProps {
  title    : string;
  subtitle : string;
}

export const PageHeader = ({ title, subtitle }: PageHeaderProps) => (
  <header>
    <h1 {...REVEAL_PROPS.heading} className="text-2xl font-bold leading-tight tracking-[-0.02em] text-balance text-text">{title}</h1>
    <p {...REVEAL_PROPS.heading} className="mt-1 text-sm text-muted">{subtitle}</p>
  </header>
);
