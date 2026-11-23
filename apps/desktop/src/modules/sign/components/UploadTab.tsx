import { useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { CREATE_TEXTS, DRAW_CANVAS } from '@/modules/sign/constants/sign';
import { Button } from '@/shared/components/Button';
import { Switch } from '@/shared/components/Switch';

interface UploadTabProps {
  preview    : string | null;
  processing : boolean;
  error      : string | null;
  onPick     : (file: File) => void;
}

// A checkerboard shows what is transparent.
const CHECKERBOARD: CSSProperties = {
  backgroundColor : '#FFFFFF',
  backgroundImage : 'conic-gradient(#D9D7E0 25%, transparent 0 50%, #D9D7E0 0 75%, transparent 0)',
  backgroundSize  : '16px 16px',
};

// The result is shown before accepting it, over a checkerboard (or white, to judge it as on paper).
export const UploadTab = ({ preview, processing, error, onPick }: UploadTabProps) => {
  const input                 = useRef<HTMLInputElement | null>(null);
  const [onWhite, setOnWhite] = useState(false);

  return (
    <div className="flex flex-col gap-2">
      <div
        className="flex items-center justify-center overflow-hidden rounded-control p-4"
        style={{ width: DRAW_CANVAS.width, height: DRAW_CANVAS.height, ...(onWhite || !preview ? { background: '#FAFAF7' } : CHECKERBOARD) }}
      >
        {preview && !processing ? (
          <img src={preview} alt="" draggable={false} className="max-h-full max-w-full object-contain" />
        ) : (
          <p className="text-center text-[12px] text-[#8C8899]">{processing ? CREATE_TEXTS.processing : CREATE_TEXTS.uploadHint}</p>
        )}
      </div>
      <div className="flex items-center gap-3">
        <Button variant="secondary" onClick={() => input.current?.click()} className="h-8">
          {preview ? CREATE_TEXTS.change : CREATE_TEXTS.upload}
        </Button>
        {preview && <Switch label={CREATE_TEXTS.onWhite} checked={onWhite} onChange={setOnWhite} />}
        {error && <span className="text-[11px] text-[#E58A9A]">{error}</span>}
      </div>
      <input
        ref={input}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) onPick(file);
          event.target.value = '';
        }}
      />
    </div>
  );
};
