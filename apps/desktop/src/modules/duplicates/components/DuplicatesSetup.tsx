import { DUPLICATES_TEXTS, MIN_SIZE_OPTIONS } from '@/modules/duplicates/constants/texts';
import { addFolder, removeFolder, setMinSize, setSimilar } from '@/modules/duplicates/store/duplicatesStore';
import { fileName } from '@/modules/duplicates/utils/filters';
import { pickFolder } from '@/modules/settings/services/settings';
import { Skeleton } from '@/shared/components/Skeleton';
import { Switch } from '@/shared/components/Switch';
import { CloseIcon } from '@/shared/icons/CloseIcon';
import { PlusIcon } from '@/shared/icons/PlusIcon';

interface DuplicatesSetupProps {
  folders  : string[] | null;
  minSize  : number;
  similar  : boolean;
  problem  : string | null;
  disabled : boolean;
}

// Where it looks (each folder can go, others can come), from what size, and the alike photos.
export const DuplicatesSetup = ({ folders, minSize, similar, problem, disabled }: DuplicatesSetupProps) => {
  const pick = () => void pickFolder(null).then((path) => {
    if (path) void addFolder(path);
  });

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="mr-1 text-[11px] font-semibold text-muted">{DUPLICATES_TEXTS.where}</span>
        {folders === null ? <Skeleton className="h-7 w-72" /> : folders.map((folder) => (
          <span key={folder} title={folder} className="flex h-7 items-center gap-1 rounded-full border border-line bg-raised pr-1 pl-2.5 text-[12px] text-text">
            {fileName(folder)}
            <button
              type="button"
              disabled={disabled}
              aria-label={DUPLICATES_TEXTS.removeOf(fileName(folder))}
              onClick={() => removeFolder(folder)}
              className="flex size-5 cursor-pointer items-center justify-center rounded-full text-muted outline-none hover:bg-line hover:text-text focus-visible:outline-2 focus-visible:outline-lilac disabled:cursor-default disabled:opacity-40"
            >
              <CloseIcon className="size-3" />
            </button>
          </span>
        ))}
        <button
          type="button"
          disabled={disabled}
          onClick={pick}
          className="flex h-7 cursor-pointer items-center gap-1 rounded-full border border-dashed border-line-strong px-2.5 text-[12px] font-semibold text-lilac outline-none hover:border-lilac focus-visible:outline-2 focus-visible:outline-lilac disabled:cursor-default disabled:opacity-40"
        >
          <PlusIcon className="size-3.5" />
          {DUPLICATES_TEXTS.addFolder}
        </button>
      </div>
      {problem && <p role="alert" className="text-[12px] text-lilac-soft">{problem}</p>}
      {folders !== null && folders.length === 0 && <p className="text-[12px] text-muted">{DUPLICATES_TEXTS.noFolders}</p>}
      <div className="flex flex-wrap items-center gap-4">
        <label className="flex items-center gap-2 text-[12px] font-semibold text-muted">
          {DUPLICATES_TEXTS.minSize}
          <select
            value={minSize}
            disabled={disabled}
            onChange={(event) => setMinSize(Number(event.target.value))}
            className="h-8 cursor-pointer rounded-control border border-line-strong bg-raised px-2 text-[12px] font-semibold text-text disabled:cursor-default"
          >
            {MIN_SIZE_OPTIONS.map((option) => <option key={option.bytes} value={option.bytes}>{option.label}</option>)}
          </select>
        </label>
        <div className="min-w-0 flex-1">
          <Switch label={DUPLICATES_TEXTS.similar} hint={DUPLICATES_TEXTS.similarHint} checked={similar} disabled={disabled} onChange={setSimilar} />
        </div>
      </div>
    </div>
  );
};
