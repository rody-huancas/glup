import { SaveOptionButton } from '@/modules/settings/components/SaveOptionButton';
import { SAVE_OPTIONS, SAVE_TEXTS } from '@/modules/settings/constants/saveLocation';
import type { SaveLocation } from '@/modules/settings/interfaces/saveLocation';
import type { SaveOption } from '@/modules/settings/interfaces/saveOption';
import { getFolderName } from '@/modules/settings/utils/folderName';
import type { Accent } from '@/shared/types/accent';

interface SaveLocationPickerProps {
  location  : SaveLocation;
  disabled? : boolean;
  accent?   : Accent;
}

// The custom option shows the chosen folder's name; the full path goes in the title.
const getLabel = (option: SaveOption, location: SaveLocation): string =>
  option.mode === 'custom' && location.mode === 'custom' && location.customFolder ? getFolderName(location.customFolder) : option.label;

export const SaveLocationPicker = ({ location, disabled = false, accent = 'mint' }: SaveLocationPickerProps) => (
  <div className="flex min-w-0 items-center gap-2">
    <span className="shrink-0 text-[11px] text-muted">{SAVE_TEXTS.label}</span>
    <div className="flex min-w-0 gap-1">
      {SAVE_OPTIONS.map((option) => (
        <SaveOptionButton
          key={option.mode}
          label={getLabel(option, location)}
          title={option.mode === 'custom' ? location.customFolder ?? undefined : undefined}
          active={location.mode === option.mode}
          disabled={disabled || location.picking}
          onClick={() => location.choose(option.mode)}
          accent={accent}
        />
      ))}
    </div>
    {location.folderMissing && (
      <p title={SAVE_TEXTS.folderMissing} className="min-w-0 truncate text-[11px] text-muted">
        {SAVE_TEXTS.folderMissing}
      </p>
    )}
  </div>
);
