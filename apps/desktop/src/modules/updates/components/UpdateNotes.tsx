import { UPDATE_TEXTS } from '@/modules/updates/constants/texts';
import { noteLines } from '@/modules/updates/utils/notes';

interface UpdateNotesProps {
  notes: string;
}

export const UpdateNotes = ({ notes }: UpdateNotesProps) => {
  const lines = noteLines(notes);

  if (lines.length === 0) return <p className="text-[13px] text-muted">{UPDATE_TEXTS.notesEmpty}</p>;

  return (
    <ul className="flex max-h-32 list-disc flex-col gap-1 overflow-y-auto scroll-thin pl-5 text-[13px] text-muted">
      {lines.map((line, index) => <li key={index}>{line}</li>)}
    </ul>
  );
};
