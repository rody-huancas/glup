import { OptionGroup } from '@/modules/pdf/components/OptionGroup';
import { QrField } from '@/modules/qr/components/QrField';
import { COUNTRIES, QR_CREATE_TEXTS } from '@/modules/qr/constants/texts';
import type { QrContent } from '@/modules/qr/interfaces/qrContent';
import type { WifiSecurity } from '@/modules/qr/types/qrTypes';
import { Switch } from '@/shared/components/Switch';

interface QrFormProps {
  content  : QrContent;
  onChange : (next: Partial<QrContent>) => void;
}

const SECURITIES: WifiSecurity[] = ['wpa', 'wep', 'open'];

// The fields of what the QR keeps.
export const QrForm = ({ content, onChange }: QrFormProps) => {
  switch (content.kind) {
    case 'text':
      return <QrField label={QR_CREATE_TEXTS.text} value={content.text} placeholder={QR_CREATE_TEXTS.textHint} multiline onChange={(text) => onChange({ text })} />;
    case 'wifi':
      return (
        <div className="flex flex-col gap-2.5">
          <QrField label={QR_CREATE_TEXTS.ssid} value={content.ssid} onChange={(ssid) => onChange({ ssid })} />
          <OptionGroup label={QR_CREATE_TEXTS.security} options={SECURITIES} labels={QR_CREATE_TEXTS.securities} value={content.security} onChange={(security) => onChange({ security })} />
          {content.security !== 'open' && <QrField label={QR_CREATE_TEXTS.password} value={content.password} onChange={(password) => onChange({ password })} />}
          <Switch accent="text" label={QR_CREATE_TEXTS.hidden} checked={content.hidden} onChange={(hidden) => onChange({ hidden })} />
          <p className="text-[11px] text-muted">{QR_CREATE_TEXTS.wifiHint}</p>
        </div>
      );
    case 'whatsapp':
      return (
        <div className="flex flex-col gap-2.5">
          <div className="flex flex-wrap gap-2">
            <label className="flex flex-col gap-1 text-[11px] font-semibold text-muted">
              {QR_CREATE_TEXTS.country}
              <select value={content.country} onChange={(event) => onChange({ country: event.target.value })} className="h-9 rounded-control border border-line-strong bg-raised px-2 text-[13px] text-text outline-none focus:border-fam-text">
                {COUNTRIES.map((country) => <option key={country.code} value={country.code}>{country.name}</option>)}
              </select>
            </label>
            <QrField label={QR_CREATE_TEXTS.number} type="tel" value={content.number} placeholder="987 654 321" onChange={(number) => onChange({ number })} />
          </div>
          <QrField label={QR_CREATE_TEXTS.message} value={content.message} multiline onChange={(message) => onChange({ message })} />
        </div>
      );
    case 'contact':
      return (
        <div className="grid grid-cols-1 gap-2.5 @md:grid-cols-2">
          <QrField label={QR_CREATE_TEXTS.name} value={content.name} onChange={(name) => onChange({ name })} />
          <QrField label={QR_CREATE_TEXTS.phone} type="tel" value={content.phone} onChange={(phone) => onChange({ phone })} />
          <QrField label={QR_CREATE_TEXTS.email} type="email" value={content.email} onChange={(email) => onChange({ email })} />
          <QrField label={QR_CREATE_TEXTS.company} value={content.company} onChange={(company) => onChange({ company })} />
        </div>
      );
    case 'email':
      return (
        <div className="flex flex-col gap-2.5">
          <QrField label={QR_CREATE_TEXTS.to} type="email" value={content.to} onChange={(to) => onChange({ to })} />
          <QrField label={QR_CREATE_TEXTS.subject} value={content.subject} onChange={(subject) => onChange({ subject })} />
          <QrField label={QR_CREATE_TEXTS.body} value={content.body} multiline onChange={(body) => onChange({ body })} />
        </div>
      );
  }
};
