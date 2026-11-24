import { useId } from 'react';
import { SortModeOption } from '@/modules/folder-sort/components/SortModeOption';
import { FOLDER_SORT_TEXTS, SORT_MODE_TEXTS } from '@/modules/folder-sort/constants/texts';
import type { SortMode } from '@/modules/folder-sort/types/sortMode';

interface SortModeChooserProps {
  mode     : SortMode;
  disabled : boolean;
  onChoose : (mode: SortMode) => void;
}

const MODES: SortMode[] = ['type', 'date'];

export const SortModeChooser = ({ mode, disabled, onChoose }: SortModeChooserProps) => {
  const titleId = useId();

  return (
    <div className="flex flex-col gap-1.5">
      <span id={titleId} className="text-[11px] font-semibold text-muted">{FOLDER_SORT_TEXTS.mode}</span>
      <div role="radiogroup" aria-labelledby={titleId} className="flex gap-2">
        {MODES.map((option) => (
          <SortModeOption
            key={option}
            label={SORT_MODE_TEXTS[option].label}
            hint={SORT_MODE_TEXTS[option].hint}
            selected={mode === option}
            disabled={disabled}
            onChoose={() => onChoose(option)}
          />
        ))}
      </div>
    </div>
  );
};
