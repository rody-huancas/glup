import { getFileName } from '@/modules/actions/utils/paths';
import { TEXT_TEXTS } from '@/modules/text/constants/texts';
import { useTextResult } from '@/modules/text/hooks/useTextResult';
import type { ExtractedText } from '@/modules/text/interfaces/extractedText';
import { TRANSCRIBE_TEXTS } from '@/modules/transcribe/constants/transcribe';
import { Button } from '@/shared/components/Button';

interface TextResultViewProps {
  message   : string;
  extracted : ExtractedText;
  onBack    : () => void;
}

// The text read, as the engine gave it (lines and paragraphs), to read here, copy or keep as a .txt.
export const TextResultView = ({ message, extracted, onBack }: TextResultViewProps) => {
  const result = useTextResult(extracted);
  const error  = result.copyFailed ? TEXT_TEXTS.copyError : result.saveFailed ? TEXT_TEXTS.saveError : null;

  return (
    <div className="mt-3 flex flex-col gap-2.5">
      <p className="text-[15px] font-semibold text-mint">{message}</p>
      <div
        role="document"
        aria-label={TEXT_TEXTS.area}
        tabIndex={0}
        className="scroll-thin max-h-[220px] min-h-[96px] overflow-y-auto whitespace-pre-wrap break-words rounded-control border border-line bg-bg px-3.5 py-3 text-[14px] leading-relaxed text-text select-text"
      >
        {extracted.text}
      </div>
      {error && <p className="text-[11px] text-[#E58A9A]">{error}</p>}
      <div className="flex flex-wrap items-center gap-2">
        <Button onClick={result.copy} className="h-10">
          {result.copied ? TEXT_TEXTS.copied : TEXT_TEXTS.copy}
        </Button>
        {result.savedPath ? (
          <Button variant="secondary" onClick={result.reveal} className="h-10">
            {TEXT_TEXTS.reveal}
          </Button>
        ) : (
          <Button variant="secondary" onClick={result.save} disabled={result.saving} className="h-10">
            {result.saving ? TEXT_TEXTS.saving : TEXT_TEXTS.save}
          </Button>
        )}
        {extracted.subtitles && !result.srtPath && (
          <Button variant="secondary" onClick={result.saveSrt} className="h-10">
            {TRANSCRIBE_TEXTS.saveSrt}
          </Button>
        )}
        <Button variant="secondary" onClick={onBack} className="h-10">
          {TEXT_TEXTS.back}
        </Button>
        {result.savedPath && <span className="min-w-0 truncate text-[12px] text-muted">{TEXT_TEXTS.saved(getFileName(result.savedPath))}</span>}
        {result.srtPath && <span className="min-w-0 truncate text-[12px] text-muted">{TRANSCRIBE_TEXTS.savedSrt(getFileName(result.srtPath))}</span>}
      </div>
    </div>
  );
};
