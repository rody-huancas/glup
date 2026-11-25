import { MediaOption } from '@/modules/media/components/MediaOption';
import { EXTRACT_TEXTS } from '@/modules/media/constants/texts';
import type { ExtractOptions } from '@/modules/media/interfaces/extractOptions';
import type { AudioFormat, AudioQuality } from '@/modules/media/types/audioFormat';
import { StepHeader } from '@/modules/pdf/components/StepHeader';
import { Button } from '@/shared/components/Button';
import { useId, useState } from 'react';

interface AudioExtractStepProps {
  onExtract : (options: ExtractOptions) => void;
  onBack    : () => void;
}

const FORMATS: AudioFormat[]   = ['mp3', 'm4a', 'wav'];
const QUALITIES: AudioQuality[] = ['normal', 'high'];

// The format (MP3 by default) and the quality of the sound taken out of the videos.
export const AudioExtractStep = ({ onExtract, onBack }: AudioExtractStepProps) => {
  const [format, setFormat]   = useState<AudioFormat>('mp3');
  const [quality, setQuality] = useState<AudioQuality>('normal');
  const formatId              = useId();
  const qualityId             = useId();

  return (
    <div className="flex flex-col gap-3">
      <StepHeader title={EXTRACT_TEXTS.title} onBack={onBack} />
      <div className="flex flex-col gap-1.5">
        <span id={formatId} className="text-[11px] font-semibold text-muted">{EXTRACT_TEXTS.format}</span>
        <div role="radiogroup" aria-labelledby={formatId} className="grid grid-cols-3 gap-2">
          {FORMATS.map((option) => <MediaOption key={option} label={EXTRACT_TEXTS.formats[option].label} hint={EXTRACT_TEXTS.formats[option].hint} selected={format === option} onChoose={() => setFormat(option)} />)}
        </div>
      </div>
      {format === 'wav' ? (
        <p className="text-[12px] text-muted">{EXTRACT_TEXTS.wavHint}</p>
      ) : (
        <div className="flex flex-col gap-1.5">
          <span id={qualityId} className="text-[11px] font-semibold text-muted">{EXTRACT_TEXTS.quality}</span>
          <div role="radiogroup" aria-labelledby={qualityId} className="grid grid-cols-2 gap-2">
            {QUALITIES.map((option) => <MediaOption key={option} label={EXTRACT_TEXTS.qualities[option].label} hint={EXTRACT_TEXTS.qualities[option].hint} selected={quality === option} onChoose={() => setQuality(option)} />)}
          </div>
        </div>
      )}
      <p className="text-[11px] text-muted">{EXTRACT_TEXTS.copyHint}</p>
      <Button variant="media" onClick={() => onExtract({ format, quality })} className="h-10 self-start">
        {EXTRACT_TEXTS.go}
      </Button>
    </div>
  );
};
