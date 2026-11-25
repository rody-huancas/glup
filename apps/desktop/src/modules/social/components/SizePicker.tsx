import { CUSTOM_ID, NETWORKS } from '@/modules/social/constants/sizes';
import { SOCIAL_TEXTS } from '@/modules/social/constants/texts';
import { OptionGroup } from '@/modules/pdf/components/OptionGroup';
import { ChoiceCard } from '@/shared/components/ChoiceCard';
import { Switch } from '@/shared/components/Switch';

interface SizePickerProps {
  networkId : string;
  sizeId    : string;
  custom    : { width: number; height: number; locked: boolean };
  onNetwork : (id: string) => void;
  onSize    : (id: string) => void;
  onSide    : (side: 'width' | 'height', value: number) => void;
  onLock    : (locked: boolean) => void;
}

const NETWORK_IDS = [...NETWORKS.map((network) => network.id), CUSTOM_ID];
const LABELS      = Object.fromEntries([...NETWORKS.map((network) => [network.id, network.network]), [CUSTOM_ID, SOCIAL_TEXTS.custom]]);

// The network, then its sizes (from sizes.json); «Personalizado» with its width, height and lock.
export const SizePicker = ({ networkId, sizeId, custom, onNetwork, onSize, onSide, onLock }: SizePickerProps) => {
  const network = NETWORKS.find((each) => each.id === networkId);
  const field   = 'h-8 w-24 rounded-control border border-line-strong bg-raised px-2 font-mono text-[13px] text-text tabular-nums outline-none focus:border-fam-images';

  return (
    <div className="flex flex-col gap-2">
      <OptionGroup label={SOCIAL_TEXTS.network} options={NETWORK_IDS} labels={LABELS} value={networkId} onChange={onNetwork} />
      {network ? (
        <div role="radiogroup" aria-label={SOCIAL_TEXTS.size} className="grid grid-cols-2 gap-2">
          {network.sizes.map((size) => (
            <ChoiceCard key={size.id} accent="images" label={size.label} hint={`${size.width} × ${size.height} px`} selected={size.id === sizeId} onChoose={() => onSize(size.id)} />
          ))}
        </div>
      ) : (
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1 text-[11px] font-semibold text-muted">
            {SOCIAL_TEXTS.width}
            <input type="number" min={1} max={8000} value={custom.width} onChange={(event) => onSide('width', Number(event.target.value))} className={field} />
          </label>
          <label className="flex flex-col gap-1 text-[11px] font-semibold text-muted">
            {SOCIAL_TEXTS.height}
            <input type="number" min={1} max={8000} value={custom.height} onChange={(event) => onSide('height', Number(event.target.value))} className={field} />
          </label>
          <div className="min-w-48">
            <Switch accent="images" label={SOCIAL_TEXTS.lock} checked={custom.locked} onChange={onLock} />
          </div>
        </div>
      )}
    </div>
  );
};
