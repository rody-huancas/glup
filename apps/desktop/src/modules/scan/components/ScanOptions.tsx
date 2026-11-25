import { useId } from 'react';
import { LookOption } from '@/modules/dock/components/LookOption';
import { SCAN_MODES, SCAN_PAPERS } from '@/modules/scan/constants/scan';
import { SCAN_TEXTS } from '@/modules/scan/constants/texts';
import type { ScanMode } from '@/modules/scan/types/scanMode';
import type { ScanPaper } from '@/modules/scan/types/scanPaper';
import { Switch } from '@/shared/components/Switch';

interface ScanOptionsProps {
  mode         : ScanMode;
  paper        : ScanPaper;
  searchable   : boolean;
  reader       : boolean;
  onMode       : (mode: ScanMode) => void;
  onPaper      : (paper: ScanPaper) => void;
  onSearchable : (on: boolean) => void;
}

// How the pages come out: the image mode, the size of the sheet and whether the text can be searched.
export const ScanOptions = ({ mode, paper, searchable, reader, onMode, onPaper, onSearchable }: ScanOptionsProps) => {
  const modeId  = useId();
  const paperId = useId();

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <span id={modeId} className="text-[11px] font-semibold text-muted">{SCAN_TEXTS.mode}</span>
        <div role="radiogroup" aria-labelledby={modeId} className="flex flex-col gap-1.5">
          {SCAN_MODES.map((option) => (
            <LookOption key={option} label={SCAN_TEXTS.modes[option].label} hint={SCAN_TEXTS.modes[option].hint} selected={mode === option} onChoose={() => onMode(option)} />
          ))}
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <span id={paperId} className="text-[11px] font-semibold text-muted">{SCAN_TEXTS.paper}</span>
        <div role="radiogroup" aria-labelledby={paperId} className="flex flex-col gap-1.5">
          {SCAN_PAPERS.map((option) => (
            <LookOption key={option} label={SCAN_TEXTS.papers[option].label} hint={SCAN_TEXTS.papers[option].hint} selected={paper === option} onChoose={() => onPaper(option)} />
          ))}
        </div>
      </div>
      <Switch label={SCAN_TEXTS.searchable} hint={reader ? SCAN_TEXTS.searchHint : SCAN_TEXTS.noReader} checked={searchable && reader} disabled={!reader} onChange={onSearchable} />
    </div>
  );
};
