import { FULL_TURN, HISTORY_LIMIT, QUARTER_TURN } from '@/modules/organize/constants/editor';
import type { EditorState } from '@/modules/organize/interfaces/editorState';
import type { EditSummary } from '@/modules/organize/interfaces/editSummary';
import type { OrganizedPage } from '@/modules/organize/interfaces/organizedPage';
import type { OrganizeRequestPage } from '@/modules/organize/interfaces/organizeRequest';
import type { EditorAction } from '@/modules/organize/types/editorAction';
import type { PageRotation } from '@/modules/organize/types/pageRotation';
import type { TurnDirection } from '@/modules/organize/types/turnDirection';

interface MovePagesParams {
  pages : OrganizedPage[];
  moved : number[];
  to    : number;
}

// Every page in its place, unturned and kept: how the PDF opens.
export const createEditor = (total: number): EditorState => ({
  pages  : Array.from({ length: total }, (_, index) => ({ page: index + 1, rotation: 0, removed: false })),
  past   : [],
  future : [],
});

export const turn = (rotation: PageRotation, direction: TurnDirection): PageRotation => {
  const step = direction === 'right' ? QUARTER_TURN : -QUARTER_TURN;
  return ((rotation + step + FULL_TURN) % FULL_TURN) as PageRotation;
};

// The moved pages keep their relative order and land before the page that was at `to`.
export const movePages = ({ pages, moved, to }: MovePagesParams): OrganizedPage[] => {
  const picked = new Set(moved);
  const moving = pages.filter((item) => picked.has(item.page));
  if (moving.length === 0) return pages;

  const before = pages.slice(0, Math.max(0, Math.min(to, pages.length))).filter((item) => !picked.has(item.page)).length;
  const rest   = pages.filter((item) => !picked.has(item.page));
  return [...rest.slice(0, before), ...moving, ...rest.slice(before)];
};

const samePages = (a: OrganizedPage[], b: OrganizedPage[]): boolean =>
  a.length === b.length && a.every((item, index) => item.page === b[index].page && item.rotation === b[index].rotation && item.removed === b[index].removed);

const update = (pages: OrganizedPage[], chosen: number[], change: (item: OrganizedPage) => OrganizedPage): OrganizedPage[] => {
  const picked = new Set(chosen);
  return pages.map((item) => (picked.has(item.page) ? change(item) : item));
};

const apply = (pages: OrganizedPage[], action: EditorAction): OrganizedPage[] => {
  switch (action.type) {
    case 'rotate'  : return update(pages, action.pages, (item) => ({ ...item, rotation: turn(item.rotation, action.direction) }));
    case 'remove'  : return update(pages, action.pages, (item) => ({ ...item, removed: true }));
    case 'restore' : return update(pages, action.pages, (item) => ({ ...item, removed: false }));
    case 'move'    : return movePages({ pages, moved: action.pages, to: action.to });
    default        : return pages;
  }
};

// Pure: every change goes to the history; one that changes nothing is not remembered.
export const editorReducer = (state: EditorState, action: EditorAction): EditorState => {
  if (action.type === 'undo') {
    const previous = state.past.at(-1);
    if (!previous) return state;
    return { pages: previous, past: state.past.slice(0, -1), future: [state.pages, ...state.future] };
  }

  if (action.type === 'redo') {
    const next = state.future[0];
    if (!next) return state;
    return { pages: next, past: [...state.past, state.pages], future: state.future.slice(1) };
  }

  const pages = apply(state.pages, action);
  if (samePages(pages, state.pages)) return state;

  return { pages, past: [...state.past, state.pages].slice(-HISTORY_LIMIT), future: [] };
};

// Anything different from the PDF as it opened (undoing everything leaves no changes).
export const hasChanges = (pages: OrganizedPage[]): boolean =>
  pages.some((item, index) => item.page !== index + 1 || item.rotation !== 0 || item.removed);

export const keptPages = (pages: OrganizedPage[]): OrganizeRequestPage[] =>
  pages.filter((item) => !item.removed).map(({ page, rotation }) => ({ page, rotation }));

export const editSummary = (pages: OrganizedPage[]): EditSummary => {
  const kept = pages.filter((item) => !item.removed);
  return { kept: kept.length, removed: pages.length - kept.length, rotated: kept.filter((item) => item.rotation !== 0).length };
};

// "Guardar PDF": only with changes and at least one page left.
export const canSave = (pages: OrganizedPage[]): boolean => hasChanges(pages) && pages.some((item) => !item.removed);
