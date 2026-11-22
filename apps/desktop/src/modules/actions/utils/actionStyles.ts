const BASE_BUTTON = 'h-11 truncate rounded-control px-3 text-[13px] font-semibold transition-colors cursor-pointer';

const PRIMARY_BUTTON   = 'bg-mint text-mint-ink hover:brightness-105';
const SECONDARY_BUTTON = 'border border-line-strong bg-raised text-text hover:bg-line';

export const getActionButtonClass = (primary: boolean): string =>
  `${BASE_BUTTON} ${primary ? PRIMARY_BUTTON : SECONDARY_BUTTON}`;
