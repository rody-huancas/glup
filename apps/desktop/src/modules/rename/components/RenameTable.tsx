import { useState } from 'react';
import { RENAME_TEXTS } from '@/modules/rename/constants/texts';
import type { RenameRow } from '@/modules/rename/interfaces/renameRule';
import { changeOf } from '@/modules/rename/utils/rename';
import { cx } from '@/shared/utils/classNames';

interface RenameTableProps {
  rows   : RenameRow[];
  onMove : (from: number, to: number) => void;
}

const arrow = 'cursor-pointer rounded px-1 text-[12px] text-muted outline-none hover:text-text focus-visible:ring-2 focus-visible:ring-fam-pc disabled:cursor-default disabled:opacity-30';

// Current name → new name, what changes in the family's colour, a problem in red under its row. The
// rows can be dragged (or moved with their arrows) to number them in that order.
export const RenameTable = ({ rows, onMove }: RenameTableProps) => {
  const [dragging, setDragging] = useState<number | null>(null);

  return (
    <table className="w-full table-fixed border-separate border-spacing-y-1 text-[13px]">
      <thead>
        <tr className="text-left text-[11px] font-semibold text-muted">
          <th scope="col" className="w-12" />
          <th scope="col" className="px-2">{RENAME_TEXTS.current}</th>
          <th scope="col" className="px-2">{RENAME_TEXTS.next}</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row, index) => {
          const change = changeOf(row.old, row.new);
          return (
            <tr
              key={row.path}
              draggable
              onDragStart={() => setDragging(index)}
              onDragOver={(event) => event.preventDefault()}
              onDrop={() => {
                if (dragging !== null) onMove(dragging, index);
                setDragging(null);
              }}
              className={cx('align-top', row.problem ? 'bg-danger-soft' : 'bg-raised', dragging === index && 'opacity-50')}
            >
              <td className="rounded-l-control px-1 py-1.5 whitespace-nowrap">
                <button type="button" className={arrow} disabled={index === 0} onClick={() => onMove(index, index - 1)} aria-label={RENAME_TEXTS.moveUp(row.old)}>↑</button>
                <button type="button" className={arrow} disabled={index === rows.length - 1} onClick={() => onMove(index, index + 1)} aria-label={RENAME_TEXTS.moveDown(row.old)}>↓</button>
              </td>
              <td className="truncate px-2 py-1.5 text-muted" title={row.path}>{row.old}</td>
              <td className="rounded-r-control px-2 py-1.5">
                <span className={cx('block truncate', row.problem ? 'text-danger' : 'text-text')} title={row.new}>
                  {change.same}<mark className={cx('rounded-sm bg-transparent font-semibold', row.problem ? 'text-danger' : 'text-fam-pc')}>{change.changed}</mark>{change.tail}
                </span>
                {row.reason && <span role="alert" className="block text-[11px] text-danger">{row.reason}</span>}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
};
