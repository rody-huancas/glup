import { useState } from 'react';
import { QR_READ_TEXTS } from '@/modules/qr/constants/texts';
import { useCopied } from '@/modules/qr/hooks/useCopied';
import type { ReadCode } from '@/modules/qr/interfaces/readCode';
import { connectQrWifi, openQrLink, saveQrContact } from '@/modules/qr/services/qr';
import { contactFileName, masked } from '@/modules/qr/utils/qr';
import { Button } from '@/shared/components/Button';
import { ConfirmDialog } from '@/shared/components/ConfirmDialog';

interface CodeCardProps {
  code   : ReadCode;
  source : string;
}

const small = 'h-8 px-3 text-[12px]';

// One code read, with what can be done with it: never opened by itself.
export const CodeCard = ({ code, source }: CodeCardProps) => {
  const { copied, copy }        = useCopied();
  const [shown, setShown]       = useState(false);
  const [asking, setAsking]     = useState(false);
  const [status, setStatus]     = useState<string | null>(null);
  const read                    = code.read;
  const header = (title: string) => (
    <div className="flex items-baseline justify-between gap-2">
      <span className="text-[11px] font-semibold tracking-wide text-fam-text uppercase">{title}</span>
      <span className="truncate text-[11px] text-muted">{code.format} · {source}</span>
    </div>
  );

  return (
    <li className="flex flex-col gap-2 rounded-control border border-line bg-raised p-3">
      {read.kind === 'link' && (
        <>
          {header(QR_READ_TEXTS.link)}
          <p className="text-lg font-bold break-all text-text">{read.host}</p>
          <p className="text-[12px] break-all text-muted">{read.url}</p>
          {read.warnings.length > 0 && (
            <div role="alert" className="rounded-control border border-danger/40 bg-danger-soft p-2 text-[12px] text-danger">
              <p className="font-semibold">{QR_READ_TEXTS.careful}</p>
              <ul className="mt-1 list-disc pl-4">{read.warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul>
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => copy('url', read.url)} className={small}>{copied === 'url' ? QR_READ_TEXTS.copied : QR_READ_TEXTS.copy}</Button>
            <Button variant="text" onClick={() => void openQrLink(read.url)} className={small}>{QR_READ_TEXTS.open}</Button>
          </div>
        </>
      )}
      {read.kind === 'wifi' && (
        <>
          {header(QR_READ_TEXTS.wifi)}
          <p className="text-lg font-bold text-text">{read.ssid}</p>
          <p className="flex items-center gap-2 text-[13px] text-muted">
            {QR_READ_TEXTS.password}:
            <span className="font-mono text-text">{read.password ? (shown ? read.password : masked(read.password)) : QR_READ_TEXTS.noPassword}</span>
            {read.password && (
              <button type="button" onClick={() => setShown((value) => !value)} className="cursor-pointer text-[12px] font-semibold text-fam-text outline-none hover:text-text focus-visible:ring-2 focus-visible:ring-fam-text">
                {shown ? QR_READ_TEXTS.hide : QR_READ_TEXTS.show}
              </button>
            )}
          </p>
          <div className="flex flex-wrap gap-2">
            {read.password && <Button variant="secondary" onClick={() => copy('password', read.password)} className={small}>{copied === 'password' ? QR_READ_TEXTS.copied : QR_READ_TEXTS.copyPass}</Button>}
            <Button variant="text" onClick={() => setAsking(true)} className={small}>{QR_READ_TEXTS.connect}</Button>
          </div>
          {asking && (
            <ConfirmDialog
              title={QR_READ_TEXTS.connectTitle(read.ssid)}
              body={QR_READ_TEXTS.connectBody}
              confirm={QR_READ_TEXTS.connectYes}
              cancel={QR_READ_TEXTS.connectNo}
              onCancel={() => setAsking(false)}
              onConfirm={() => {
                setAsking(false);
                void connectQrWifi(read).then(() => setStatus(QR_READ_TEXTS.connected)).catch((failure: unknown) => setStatus(String(failure)));
              }}
            />
          )}
        </>
      )}
      {read.kind === 'contact' && (
        <>
          {header(QR_READ_TEXTS.contact)}
          <p className="text-lg font-bold text-text">{read.name || read.phone || read.email}</p>
          <p className="text-[12px] text-muted">{[read.phone, read.email, read.company].filter(Boolean).join(' · ')}</p>
          <div className="flex flex-wrap gap-2">
            <Button variant="text" onClick={() => void saveQrContact(read.vcard, contactFileName(read.name, QR_READ_TEXTS.contactName)).then((saved) => saved && setStatus(QR_READ_TEXTS.savedContact))} className={small}>{QR_READ_TEXTS.saveContact}</Button>
          </div>
        </>
      )}
      {read.kind === 'email' && (
        <>
          {header(QR_READ_TEXTS.email)}
          <p className="text-lg font-bold break-all text-text">{read.to}</p>
          {(read.subject || read.body) && <p className="text-[12px] text-muted">{[read.subject, read.body].filter(Boolean).join(' · ')}</p>}
          <Button variant="secondary" onClick={() => copy('to', read.to)} className={`${small} self-start`}>{copied === 'to' ? QR_READ_TEXTS.copied : QR_READ_TEXTS.copy}</Button>
        </>
      )}
      {read.kind === 'phone' && (
        <>
          {header(QR_READ_TEXTS.phone)}
          <p className="text-lg font-bold text-text">{read.number}</p>
          <Button variant="secondary" onClick={() => copy('phone', read.number)} className={`${small} self-start`}>{copied === 'phone' ? QR_READ_TEXTS.copied : QR_READ_TEXTS.copy}</Button>
        </>
      )}
      {read.kind === 'text' && (
        <>
          {header(QR_READ_TEXTS.text)}
          <p className="text-[13px] break-words whitespace-pre-wrap text-text">{read.text}</p>
          <Button variant="secondary" onClick={() => copy('text', read.text)} className={`${small} self-start`}>{copied === 'text' ? QR_READ_TEXTS.copied : QR_READ_TEXTS.copy}</Button>
        </>
      )}
      {status && <p role="status" className="text-[12px] text-muted">{status}</p>}
    </li>
  );
};
