import { OptionGroup } from '@/modules/pdf/components/OptionGroup';
import type { PageProps } from '@/modules/main-window/interfaces/pageProps';
import { QrForm } from '@/modules/qr/components/QrForm';
import { QrLook } from '@/modules/qr/components/QrLook';
import { QR_CREATE_TEXTS, QR_FORMATS, QR_KINDS } from '@/modules/qr/constants/texts';
import { useQrCreator } from '@/modules/qr/hooks/useQrCreator';
import { SaveLocationPicker } from '@/modules/settings/components/SaveLocationPicker';
import { Button } from '@/shared/components/Button';
import { PageHeader } from '@/shared/components/PageHeader';
import { SectionLabel } from '@/shared/components/SectionLabel';

const SIZES = ['512', '1024', '2048'] as const;

// "Crear un QR": the live preview on the left (checked by Glup's own reader), what it keeps and how it
// looks on the right; «Guardar en», «Copiar imagen» and «Guardar QR» under them.
export const QrCreatePage = ({ files }: PageProps) => {
  const qr       = useQrCreator();
  const location = files.saveLocation;

  return (
    <div className="@container flex flex-col gap-4">
      <PageHeader title={QR_CREATE_TEXTS.title} subtitle={QR_CREATE_TEXTS.subtitle} />
      <div className="grid grid-cols-1 gap-5 @3xl:grid-cols-[minmax(240px,1fr)_minmax(320px,1.2fr)]">
        <div className="flex flex-col gap-2 @3xl:sticky @3xl:top-0 @3xl:self-start">
          <div aria-label={QR_CREATE_TEXTS.preview} role="img" className="flex aspect-square w-full max-w-sm items-center justify-center self-center overflow-hidden rounded-control border border-line bg-bg">
            {qr.preview && qr.filled ? (
              <img src={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(qr.preview.svg)}`} alt="" className="size-full" />
            ) : (
              <p className="p-6 text-center text-[13px] text-muted">{QR_CREATE_TEXTS.empty}</p>
            )}
          </div>
          <div aria-live="polite" className="flex flex-col gap-1 text-[12px]">
            {qr.error && <p role="alert" className="text-danger">{qr.error}</p>}
            {qr.filled && qr.checking && <p className="text-muted">{QR_CREATE_TEXTS.checking}</p>}
            {qr.filled && !qr.checking && qr.preview?.readable && qr.preview.warnings.length === 0 && <p className="text-fam-text">{QR_CREATE_TEXTS.readable}</p>}
            {qr.preview?.warnings.map((warning) => <p key={warning} className={qr.preview?.readable ? 'text-muted' : 'text-danger'}>{warning}</p>)}
          </div>
        </div>
        <div className="flex min-w-0 flex-col gap-4">
          <OptionGroup label={QR_CREATE_TEXTS.kind} options={QR_KINDS} labels={QR_CREATE_TEXTS.kinds} value={qr.kind} onChange={qr.setKind} />
          <QrForm content={qr.content} onChange={qr.change} />
          <SectionLabel>{QR_CREATE_TEXTS.look}</SectionLabel>
          <QrLook style={qr.style} logo={qr.logo} onStyle={qr.restyle} onLogo={qr.chooseLogo} />
          <div className="flex flex-wrap items-end gap-4">
            <OptionGroup label={QR_CREATE_TEXTS.format} options={QR_FORMATS} labels={QR_CREATE_TEXTS.formats} value={qr.format} onChange={qr.setFormat} />
            {qr.format === 'png' && <OptionGroup label={QR_CREATE_TEXTS.size} options={[...SIZES]} labels={QR_CREATE_TEXTS.sizes} value={String(qr.size) as (typeof SIZES)[number]} onChange={(value) => qr.setSize(Number(value))} />}
          </div>
          <div className="flex flex-wrap items-center gap-3 border-t border-line pt-3">
            <SaveLocationPicker location={location} accent="text" />
            <span className="flex-1" />
            <Button variant="secondary" onClick={qr.copy} disabled={!qr.filled || !qr.preview} className="h-10 disabled:cursor-not-allowed disabled:opacity-50">{qr.copied ? QR_CREATE_TEXTS.copied : QR_CREATE_TEXTS.copy}</Button>
            <Button variant="text" onClick={() => qr.save(location.destination)} disabled={!qr.filled || !qr.preview} className="h-10 disabled:cursor-not-allowed disabled:bg-raised disabled:text-muted">{QR_CREATE_TEXTS.save}</Button>
          </div>
          {qr.saved && (
            <p role="status" className="flex items-center gap-2 text-[12px] text-fam-text">
              {QR_CREATE_TEXTS.saved}
              <button type="button" onClick={qr.reveal} className="cursor-pointer font-semibold underline decoration-dotted underline-offset-2 outline-none hover:text-text focus-visible:ring-2 focus-visible:ring-fam-text">{QR_CREATE_TEXTS.reveal}</button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
