import { ACTIONS_TEXTS } from '@/modules/actions/constants/texts';
import type { SaveLocation } from '@/modules/settings/interfaces/saveLocation';
import { Switch } from '@/shared/components/Switch';

interface BundleZipToggleProps {
  location  : SaveLocation;
  disabled? : boolean;
}

export const BundleZipToggle = ({ location, disabled = false }: BundleZipToggleProps) => (
  <Switch label={ACTIONS_TEXTS.bundleZip} checked={location.bundleZip} disabled={disabled} onChange={location.setBundleZip} />
);
