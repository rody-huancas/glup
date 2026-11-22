import { formatFileSize } from '@/modules/actions/utils/fileSize';

interface ConfirmGroupProps {
  label : string;
  size  : number;
}

export const ConfirmGroup = ({ label, size }: ConfirmGroupProps) => (
  <li className="flex items-center justify-between gap-4 rounded-control bg-raised px-3 py-2.5">
    <span className="text-[12px] text-text">{label}</span>
    <span className="shrink-0 text-[13px] font-semibold text-text">{formatFileSize(size)}</span>
  </li>
);
