import { getFileName } from '@/modules/actions/utils/paths';
import { OptionGroup } from '@/modules/pdf/components/OptionGroup';
import { QR_CREATE_TEXTS, QR_SHAPES } from '@/modules/qr/constants/texts';
import type { QrLogo, QrStyle } from '@/modules/qr/interfaces/qrStyle';

interface QrLookProps {
  style    : QrStyle;
  logo     : QrLogo;
  onStyle  : (next: Partial<QrStyle>) => void;
  onLogo   : (choice: QrLogo['kind']) => void;
}

const LOGOS: QrLogo['kind'][] = ['none', 'glup', 'file'];
const colour = 'flex items-center gap-2 text-[12px] font-semibold text-muted';

// Colours, shapes, the logo and the margin.
export const QrLook = ({ style, logo, onStyle, onLogo }: QrLookProps) => (
  <div className="flex flex-col gap-2.5">
    <div className="flex flex-wrap gap-4">
      <label className={colour}>
        <input type="color" value={style.dark} onChange={(event) => onStyle({ dark: event.target.value })} className="h-8 w-12 cursor-pointer rounded-control border border-line-strong bg-raised" />
        {QR_CREATE_TEXTS.dark}
      </label>
      <label className={colour}>
        <input type="color" value={style.light} onChange={(event) => onStyle({ light: event.target.value })} className="h-8 w-12 cursor-pointer rounded-control border border-line-strong bg-raised" />
        {QR_CREATE_TEXTS.light}
      </label>
    </div>
    <OptionGroup label={QR_CREATE_TEXTS.dots} options={QR_SHAPES} labels={QR_CREATE_TEXTS.shapes} value={style.dots} onChange={(dots) => onStyle({ dots })} />
    <OptionGroup label={QR_CREATE_TEXTS.corners} options={QR_SHAPES} labels={QR_CREATE_TEXTS.shapes} value={style.corners} onChange={(corners) => onStyle({ corners })} />
    <OptionGroup label={QR_CREATE_TEXTS.logo} options={LOGOS} labels={QR_CREATE_TEXTS.logos} value={logo.kind} onChange={onLogo} />
    {logo.kind === 'file' && <p className="truncate text-[11px] text-muted" title={logo.path}>{getFileName(logo.path)}</p>}
    {logo.kind !== 'none' && <p className="text-[11px] text-muted">{QR_CREATE_TEXTS.logoHint}</p>}
    <label className="flex flex-col gap-1 text-[11px] font-semibold text-muted">
      <span className="flex justify-between">{QR_CREATE_TEXTS.margin}<span className="tabular-nums">{style.margin}</span></span>
      <input type="range" min={0} max={8} step={1} value={style.margin} onChange={(event) => onStyle({ margin: Number(event.target.value) })} className="cursor-pointer accent-fam-text" />
    </label>
  </div>
);
