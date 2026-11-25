import { formatFileSize } from '@/modules/actions/utils/fileSize';
import { AUTO_FOLDERS_TEXTS } from '@/modules/auto-folders/constants/texts';
import type { RulePreview } from '@/modules/auto-folders/interfaces/rulePreview';
import { Skeleton } from '@/shared/components/Skeleton';

interface RulePreviewBoxProps {
  preview       : RulePreview | null;
  previewing    : boolean;
  applyExisting : boolean;
  onApply       : (apply: boolean) => void;
}

// What the rule would do with what is already in the folder (nothing is done here), and whether to do it
// with that too or only with what arrives.
export const RulePreviewBox = ({ preview, previewing, applyExisting, onApply }: RulePreviewBoxProps) => {
  if (!preview) return previewing ? <Skeleton className="h-20 w-full" /> : null;
  const more = preview.total - preview.files.length;

  return (
    <section className="flex flex-col gap-2 rounded-[14px] border border-line bg-raised p-3.5" aria-busy={previewing}>
      <p className="text-xs font-semibold text-text">{AUTO_FOLDERS_TEXTS.previewTitle}</p>
      {preview.total === 0 ? (
        <p className="text-xs text-muted">{AUTO_FOLDERS_TEXTS.previewNone}</p>
      ) : (
        <>
          <p className="text-xs text-muted">{AUTO_FOLDERS_TEXTS.previewSome(preview.total, formatFileSize(preview.bytes))}</p>
          <ul className="flex max-h-36 flex-col gap-0.5 overflow-y-auto scroll-thin text-xs">
            {preview.files.map((file) => (
              <li key={file.name} className="flex min-w-0 items-baseline gap-2">
                <span className="min-w-0 flex-1 truncate text-text">{file.name}</span>
                {file.into && <span className="shrink-0 text-fam-pc">→ {file.into}</span>}
                <span className="shrink-0 text-muted">{formatFileSize(file.size)}</span>
              </li>
            ))}
          </ul>
          {more > 0 && <p className="text-xs text-muted">{AUTO_FOLDERS_TEXTS.previewMore(more)}</p>}
          <fieldset className="mt-1 flex flex-col gap-1.5 text-xs text-text">
            <label className="flex cursor-pointer items-center gap-2">
              <input type="radio" name="apply" checked={!applyExisting} onChange={() => onApply(false)} className="accent-fam-pc" />
              {AUTO_FOLDERS_TEXTS.onlyNew}
            </label>
            <label className="flex cursor-pointer items-center gap-2">
              <input type="radio" name="apply" checked={applyExisting} onChange={() => onApply(true)} className="accent-fam-pc" />
              {AUTO_FOLDERS_TEXTS.applyAll(preview.total)}
            </label>
          </fieldset>
        </>
      )}
      {preview.downloading > 0 && <p className="text-xs text-muted">{AUTO_FOLDERS_TEXTS.downloading(preview.downloading)}</p>}
    </section>
  );
};
