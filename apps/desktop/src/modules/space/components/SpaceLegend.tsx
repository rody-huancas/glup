import { KIND_HEX, KIND_LABELS, KIND_ORDER, SPACE_TEXTS } from '@/modules/space/constants/texts';

// What each colour of the map means (a folder takes the colour of what weighs most in it).
export const SpaceLegend = () => (
  <ul aria-label={SPACE_TEXTS.legend} className="flex flex-wrap gap-x-3 gap-y-1 text-[12px] text-muted">
    {KIND_ORDER.map((kind) => (
      <li key={kind} className="flex items-center gap-1.5">
        <span aria-hidden className="size-2.5 rounded-sm" style={{ backgroundColor: KIND_HEX[kind] }} />
        {KIND_LABELS[kind]}
      </li>
    ))}
  </ul>
);
