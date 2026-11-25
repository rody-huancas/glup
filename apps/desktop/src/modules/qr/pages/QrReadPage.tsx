import type { PageProps } from '@/modules/main-window/interfaces/pageProps';
import { CodeCard } from '@/modules/qr/components/CodeCard';
import { QR_READ_TEXTS } from '@/modules/qr/constants/texts';
import { useQrReader } from '@/modules/qr/hooks/useQrReader';
import { pickCodeFiles } from '@/modules/qr/services/qr';
import { allCodes } from '@/modules/qr/utils/qr';
import { Button } from '@/shared/components/Button';
import { PageHeader } from '@/shared/components/PageHeader';

// "Leer un QR": where to read from (an image or PDF, a zone of the screen, what was copied), then each
// code found with its own actions; the places where nothing was found are said too.
export const QrReadPage = (_props: PageProps) => {
  const reader = useQrReader();
  const codes  = allCodes(reader.sources);
  const empty  = reader.sources.filter((source) => source.codes.length === 0);

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title={QR_READ_TEXTS.title} subtitle={QR_READ_TEXTS.subtitle} />
      <div className="flex flex-wrap gap-2">
        <Button variant="text" onClick={() => void pickCodeFiles().then((paths) => {
          if (paths.length > 0) void reader.readPaths(paths);
        })} className="h-10">{QR_READ_TEXTS.choose}</Button>
        <Button variant="secondary" onClick={reader.fromScreen} className="h-10">{QR_READ_TEXTS.screen}</Button>
        <Button variant="secondary" onClick={reader.fromClipboard} className="h-10">{QR_READ_TEXTS.clipboard}</Button>
        {reader.sources.length > 0 && <Button variant="secondary" onClick={reader.clear} className="ml-auto h-10">{QR_READ_TEXTS.clear}</Button>}
      </div>
      <div aria-live="polite" className="flex flex-col gap-1 text-[12px]">
        {reader.reading && <p className="text-muted">{QR_READ_TEXTS.reading}</p>}
        {reader.problem && <p role="alert" className="text-danger">{reader.problem}</p>}
        {empty.map((source) => <p key={source.id} className="text-muted">{source.label}: {source.error ?? QR_READ_TEXTS.none}</p>)}
      </div>
      {codes.length > 0 ? (
        <ul className="grid grid-cols-1 gap-3 @2xl:grid-cols-2">
          {codes.map(({ code, source, key }) => <CodeCard key={key} code={code} source={source.label} />)}
        </ul>
      ) : (
        !reader.reading && reader.sources.length === 0 && <p className="text-[13px] text-muted">{QR_READ_TEXTS.empty}</p>
      )}
    </div>
  );
};
