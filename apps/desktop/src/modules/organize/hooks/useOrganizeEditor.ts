import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { GRID_COLUMNS } from '@/modules/organize/constants/grid';
import { ORGANIZE_TEXTS } from '@/modules/organize/constants/texts';
import type { OrganizeTarget } from '@/modules/organize/interfaces/organizeTarget';
import { organizePdf } from '@/modules/organize/services/organizePdf';
import type { SelectMode } from '@/modules/organize/types/selectMode';
import type { TurnDirection } from '@/modules/organize/types/turnDirection';
import { canSave, createEditor, editorReducer, editSummary, hasChanges, keptPages } from '@/modules/organize/utils/editor';
import { moveTarget, readKey } from '@/modules/organize/utils/keys';
import { selectPage, targetPages } from '@/modules/organize/utils/selection';
import type { SaveDestination } from '@/modules/settings/interfaces/appSettings';
import { enqueueTask } from '@/modules/tasks/store/taskStore';
import { useKeyDown } from '@/shared/hooks/useKeyDown';

interface UseOrganizeEditorParams {
  target      : OrganizeTarget;
  total       : number;
  destination : SaveDestination;
  onExit      : () => void;
}

interface SelectionState {
  selected : number[];
  anchor   : number | null;
}

const EMPTY_SELECTION: SelectionState = { selected: [], anchor: null };

// The organizing screen: the edit (a pure reducer with undo), which pages are chosen, the page with
// the keyboard focus and the exit dialog. Saving queues a task like any other action and leaves.
export const useOrganizeEditor = ({ target, total, destination, onExit }: UseOrganizeEditorParams) => {
  const [state, dispatch]             = useReducer(editorReducer, total, createEditor);
  const [selection, setSelection]     = useState<SelectionState>(EMPTY_SELECTION);
  const [focused, setFocused]         = useState(1);
  const [confirmExit, setConfirmExit] = useState(false);
  // Set by the keyboard, so the focus follows; mouse clicks focus on their own.
  const focusByKey                    = useRef(false);

  const pages    = state.pages;
  const order    = useMemo(() => pages.map((item) => item.page), [pages]);
  const selected = selection.selected;
  const changed  = hasChanges(pages);

  const select = useCallback((page: number, mode: SelectMode) => {
    setSelection((current) => selectPage({ order, selected: current.selected, anchor: current.anchor, page, mode }));
    setFocused(page);
  }, [order]);

  const rotate  = useCallback((chosen: number[], direction: TurnDirection) => dispatch({ type: 'rotate', pages: chosen, direction }), []);
  const remove  = useCallback((chosen: number[]) => dispatch({ type: 'remove', pages: chosen }), []);
  const restore = useCallback((chosen: number[]) => dispatch({ type: 'restore', pages: chosen }), []);
  const move    = useCallback((chosen: number[], to: number) => dispatch({ type: 'move', pages: chosen, to }), []);
  const undo    = useCallback(() => dispatch({ type: 'undo' }), []);
  const redo    = useCallback(() => dispatch({ type: 'redo' }), []);

  const selectAll  = useCallback(() => setSelection({ selected: order, anchor: order[0] ?? null }), [order]);
  const selectNone = useCallback(() => setSelection(EMPTY_SELECTION), []);

  const requestExit = useCallback(() => {
    if (changed) setConfirmExit(true);
    else onExit();
  }, [changed, onExit]);

  const save = () => {
    if (!canSave(pages)) return;

    const request = keptPages(pages);
    enqueueTask({
      title     : ORGANIZE_TEXTS.taskTitle(target.name),
      type      : 'pdf',
      fileCount : 1,
      owner     : 'home',
      run       : ({ taskId }) => organizePdf({ path: target.path, pages: request, destination, taskId }),
    });
    onExit();
  };

  // Arrows move the focus (and choose that page), Ctrl+arrows move the chosen pages, Supr removes them,
  // Ctrl+Z / Ctrl+Y undo and redo, Esc lets go of the selection and then asks to leave.
  const onKey = useCallback((event: KeyboardEvent) => {
    const command = readKey(event, GRID_COLUMNS);
    if (!command) return;

    event.preventDefault();
    const chosen = targetPages(selected, focused);

    switch (command.type) {
      case 'focus': {
        const index = Math.min(Math.max(order.indexOf(focused) + command.step, 0), order.length - 1);
        focusByKey.current = true;
        setFocused(order[index]);
        setSelection({ selected: [order[index]], anchor: order[index] });
        return;
      }
      case 'move': {
        const to = moveTarget({ order, pages: chosen, step: command.step });
        focusByKey.current = true;
        if (to >= 0) move(chosen, to);
        return;
      }
      case 'remove'     : return remove(chosen);
      case 'undo'       : return undo();
      case 'redo'       : return redo();
      case 'select-all' : return selectAll();
      case 'escape'     : return selected.length > 0 ? selectNone() : requestExit();
    }
  }, [selected, focused, order, move, remove, undo, redo, selectAll, selectNone, requestExit]);

  useEffect(() => {
    if (confirmExit) return;

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [confirmExit, onKey]);

  // With the exit dialog open, Esc is "Seguir organizando".
  useKeyDown({ key: 'Escape', enabled: confirmExit, handler: () => setConfirmExit(false) });

  // The tile with the focus, once it changed from the keyboard (after moving, it is in its new place).
  const takeKeyFocus = useCallback((): boolean => {
    const byKey = focusByKey.current;
    focusByKey.current = false;
    return byKey;
  }, []);

  const chosenPages = pages.filter((item) => selected.includes(item.page));

  return {
    pages,
    order,
    selected,
    focused,
    select,
    rotate,
    remove,
    restore,
    move,
    undo,
    redo,
    canUndo      : state.past.length > 0,
    canRedo      : state.future.length > 0,
    selectAll,
    selectNone,
    allSelected  : selected.length === order.length,
    // The bar's "Quitar" becomes "Recuperar" when every chosen page is already removed.
    allRemoved   : chosenPages.length > 0 && chosenPages.every((item) => item.removed),
    changed,
    canSave      : canSave(pages),
    summary      : editSummary(pages),
    save,
    requestExit,
    confirmExit,
    keepEditing  : () => setConfirmExit(false),
    takeKeyFocus,
  };
};
