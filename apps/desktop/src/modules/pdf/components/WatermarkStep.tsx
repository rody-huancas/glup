import { useState } from 'react';
import { OptionGroup } from '@/modules/pdf/components/OptionGroup';
import { PagePreview } from '@/modules/pdf/components/PagePreview';
import { PreviewLabel } from '@/modules/pdf/components/PreviewLabel';
import { StepHeader } from '@/modules/pdf/components/StepHeader';
import {
  DEFAULT_WATERMARK,
  MAX_WATERMARK_TEXT,
  OPACITY_LABELS,
  POSITION_LABELS,
  PRESET_ORDER,
  SIZE_LABELS,
  WATERMARK_PRESETS,
  WATERMARK_TEXTS,
} from '@/modules/pdf/constants/watermark';
import type { WatermarkOptions } from '@/modules/pdf/interfaces/watermarkOptions';
import type { WatermarkPreset } from '@/modules/pdf/types/watermark';
import { boldTextUnit } from '@/modules/pdf/utils/measureWidth';
import { watermarkPreview } from '@/modules/pdf/utils/stampPreview';
import { watermarkProblem, watermarkText } from '@/modules/pdf/utils/watermark';
import { Button } from '@/shared/components/Button';

interface WatermarkStepProps {
  // The first PDF chosen: its first page is the preview.
  path      : string;
  onConfirm : (options: WatermarkOptions) => void;
  onBack    : () => void;
}

// "Marca de agua": the text (quick ones or typed), size, transparency and position, seen on the first page.
export const WatermarkStep = ({ path, onConfirm, onBack }: WatermarkStepProps) => {
  const [preset, setPreset]   = useState<WatermarkPreset>('copy');
  const [custom, setCustom]   = useState('');
  const [options, setOptions] = useState(DEFAULT_WATERMARK);

  const text    = watermarkText({ preset, custom });
  const problem = watermarkProblem(text);
  const full    = { ...options, text };
  const submit  = () => !problem && onConfirm(full);

  return (
    <div className="flex flex-col">
      <StepHeader title={WATERMARK_TEXTS.title} onBack={onBack} />
      <div className="mt-2.5 flex gap-4">
        <div className="flex min-w-0 flex-1 flex-col gap-2.5">
          <OptionGroup label={WATERMARK_TEXTS.text} options={PRESET_ORDER} labels={WATERMARK_PRESETS} value={preset} onChange={setPreset} />
          {preset === 'custom' && (
            <input
              value={custom}
              onChange={(event) => setCustom(event.target.value)}
              onKeyDown={(event) => event.key === 'Enter' && submit()}
              maxLength={MAX_WATERMARK_TEXT * 2}
              placeholder={WATERMARK_TEXTS.placeholder}
              aria-label={WATERMARK_TEXTS.customField}
              autoFocus
              className="h-9 rounded-control border border-line-strong bg-raised px-3 text-sm text-text outline-none focus:border-lilac"
            />
          )}
          <OptionGroup label={WATERMARK_TEXTS.size} options={['small', 'medium', 'large']} labels={SIZE_LABELS} value={options.size} onChange={(size) => setOptions({ ...options, size })} />
          <OptionGroup label={WATERMARK_TEXTS.opacity} options={['soft', 'medium', 'strong']} labels={OPACITY_LABELS} value={options.opacity} onChange={(opacity) => setOptions({ ...options, opacity })} />
          <OptionGroup label={WATERMARK_TEXTS.position} options={['diagonal', 'corner']} labels={POSITION_LABELS} value={options.position} onChange={(position) => setOptions({ ...options, position })} />
          <div className="flex items-center gap-3">
            {problem && preset === 'custom' && <span className="min-w-0 flex-1 text-[12px] text-[#E58A9A]">{problem}</span>}
            <Button onClick={submit} disabled={problem !== null} className="ml-auto h-10 disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:brightness-100">
              {WATERMARK_TEXTS.button}
            </Button>
          </div>
        </div>
        <PagePreview path={path} page={1} label={WATERMARK_TEXTS.preview}>
          {(page) => text && <PreviewLabel text={text} preview={watermarkPreview({ options: full, page, unit: boldTextUnit(text) })} bold muted />}
        </PagePreview>
      </div>
    </div>
  );
};
