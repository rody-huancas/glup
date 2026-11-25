import type { HTMLInputTypeAttribute } from 'react';

interface QrFieldProps {
  label        : string;
  value        : string;
  onChange     : (value: string) => void;
  placeholder? : string;
  type?        : HTMLInputTypeAttribute;
  multiline?   : boolean;
}

const field = 'rounded-control border border-line-strong bg-raised px-2 text-[13px] text-text outline-none focus:border-fam-text';

// One field of the forms of Crear un QR.
export const QrField = ({ label, value, onChange, placeholder, type = 'text', multiline = false }: QrFieldProps) => (
  <label className="flex min-w-0 flex-1 flex-col gap-1 text-[11px] font-semibold text-muted">
    {label}
    {multiline ? (
      <textarea value={value} rows={3} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} className={`${field} resize-none py-1.5`} />
    ) : (
      <input value={value} type={type} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} className={`${field} h-9`} />
    )}
  </label>
);
