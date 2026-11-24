import { PHOTO_TEXTS } from '@/modules/photos/constants/photos';
import type { SaveLocation } from '@/modules/settings/interfaces/saveLocation';
import { Switch } from '@/shared/components/Switch';

interface RemoveLocationToggleProps {
  location  : SaveLocation;
  disabled? : boolean;
}

// On by default: a photo's new file keeps its date, never where it was taken unless this is turned off.
export const RemoveLocationToggle = ({ location, disabled = false }: RemoveLocationToggleProps) => (
  <Switch label={PHOTO_TEXTS.removeLocation} checked={!location.keepLocation} disabled={disabled} onChange={(on) => location.setKeepLocation(!on)} />
);
