import { formatFileSize } from '@/modules/actions/utils/fileSize';
import { MediaOption } from '@/modules/media/components/MediaOption';
import { ANIMATION_TEXTS } from '@/modules/media/constants/texts';
import type { AnimationOptions } from '@/modules/media/interfaces/animationOptions';
import type { AnimationFormat } from '@/modules/media/types/animationFormat';
import { GIF_FPS, SUGGESTED_SECONDS } from '@/modules/media/utils/animation';
import { OptionGroup } from '@/modules/pdf/components/OptionGroup';
import { Button } from '@/shared/components/Button';
import { Switch } from '@/shared/components/Switch';
import { useId } from 'react';

interface AnimationOptionsPanelProps {
  options    : AnimationOptions;
  widths     : number[];
  sourceW    : number;
  seconds    : number;
  weight     : number;
  exact      : boolean;
  heavy      : boolean;
  previewing : boolean;
  failed     : boolean;
  onChange   : (next: Partial<AnimationOptions>) => void;
  onPreview  : () => void;
}

const FORMATS: AnimationFormat[] = ['gif', 'webp'];

// GIF or WebP, the width, the frames per second and «Repetir siempre», with the weight they give.
export const AnimationOptionsPanel = ({ options, widths, sourceW, seconds, weight, exact, heavy, previewing, failed, onChange, onPreview }: AnimationOptionsPanelProps) => {
  const formatId = useId();
  const widthKey = (width: number) => String(width);
  const labels   = Object.fromEntries(widths.map((width) => [widthKey(width), width === sourceW && width < 640 && !ANIMATION_TEXTS.fixedWidths.includes(width) ? ANIMATION_TEXTS.original(width) : `${width} px`]));
  const fps      = GIF_FPS.map(String);

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex flex-col gap-1.5">
        <span id={formatId} className="text-[11px] font-semibold text-muted">{ANIMATION_TEXTS.format}</span>
        <div role="radiogroup" aria-labelledby={formatId} className="grid grid-cols-2 gap-2">
          {FORMATS.map((format) => <MediaOption key={format} label={ANIMATION_TEXTS.formats[format].label} hint={ANIMATION_TEXTS.formats[format].hint} selected={options.format === format} onChoose={() => onChange({ format })} />)}
        </div>
      </div>
      <div className="flex flex-wrap items-end gap-4">
        <OptionGroup label={ANIMATION_TEXTS.width} options={widths.map(widthKey)} labels={labels} value={widthKey(options.width)} onChange={(value) => onChange({ width: Number(value) })} />
        <OptionGroup label={ANIMATION_TEXTS.fps} options={fps} labels={Object.fromEntries(fps.map((value) => [value, value]))} value={String(options.fps)} onChange={(value) => onChange({ fps: Number(value) })} />
        <div className="min-w-48">
          <Switch label={ANIMATION_TEXTS.loop} checked={options.loopForever} onChange={(loopForever) => onChange({ loopForever })} />
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <p aria-live="polite" className="text-[13px] text-text">
          {exact ? ANIMATION_TEXTS.weighs(formatFileSize(weight)) : ANIMATION_TEXTS.willWeigh(formatFileSize(weight))}
        </p>
        <Button variant="secondary" onClick={onPreview} disabled={previewing} className="h-8 px-3 text-[12px] disabled:opacity-60">
          {previewing ? ANIMATION_TEXTS.previewing : ANIMATION_TEXTS.preview}
        </Button>
      </div>
      {heavy && <p className="text-[12px] text-muted">{ANIMATION_TEXTS.heavy}</p>}
      {seconds > SUGGESTED_SECONDS && <p className="text-[12px] text-muted">{ANIMATION_TEXTS.long(SUGGESTED_SECONDS)}</p>}
      {failed && <p role="alert" className="text-[12px] text-danger">{ANIMATION_TEXTS.failed}</p>}
    </div>
  );
};
