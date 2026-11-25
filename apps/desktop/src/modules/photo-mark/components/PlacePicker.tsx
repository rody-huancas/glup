import { GRID_PLACES, MARK_TEXTS, PLACE_LABELS } from '@/modules/photo-mark/constants/texts';
import type { MarkPlace } from '@/modules/photo-mark/types/markTypes';
import { ChoiceCard } from '@/shared/components/ChoiceCard';
import { cx } from '@/shared/utils/classNames';

interface PlacePickerProps {
  value    : MarkPlace;
  onChange : (place: MarkPlace) => void;
}

// The nine places as a small grid of the photo, and «En mosaico».
export const PlacePicker = ({ value, onChange }: PlacePickerProps) => (
  <div className="flex flex-col gap-1.5">
    <span className="text-[11px] font-semibold text-muted">{MARK_TEXTS.place}</span>
    <div className="flex items-stretch gap-3">
      <div role="radiogroup" aria-label={MARK_TEXTS.place} className="grid size-24 shrink-0 grid-cols-3 gap-1 rounded-control border border-line-strong bg-bg p-1">
        {GRID_PLACES.map((place) => (
          <button
            key={place}
            type="button"
            role="radio"
            aria-checked={value === place}
            aria-label={PLACE_LABELS[place]}
            title={PLACE_LABELS[place]}
            onClick={() => onChange(place)}
            className={cx('cursor-pointer rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-fam-images', value === place ? 'bg-fam-images' : 'bg-raised hover:bg-line')}
          />
        ))}
      </div>
      <div role="radiogroup" aria-label={MARK_TEXTS.mosaic} className="flex flex-1">
        <ChoiceCard accent="images" label={MARK_TEXTS.mosaic} hint={MARK_TEXTS.mosaicHint} selected={value === 'mosaic'} onChoose={() => onChange('mosaic')} />
      </div>
    </div>
  </div>
);
