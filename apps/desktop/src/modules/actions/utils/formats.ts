import { EXTENSION_FORMATS } from '@/modules/actions/constants/formats';
import { BUNDLE_ACTIONS, IMPLEMENTED_ACTIONS, PAGE_BUNDLE_ACTIONS } from '@/modules/actions/constants/implemented';
import type { FileSelection } from '@/modules/actions/interfaces/fileSelection';
import type { ActionId } from '@/modules/actions/types/actionId';
import type { ImageFormat } from '@/modules/actions/types/imageFormat';
import { getExtension } from '@/modules/actions/utils/paths';

// A format is disabled when every selected image already is in it.
export const isSameFormat = (selection: FileSelection, format: ImageFormat): boolean =>
  selection.files.every((file) => EXTENSION_FORMATS[getExtension(file.path)] === format);

export const isImplemented = (selection: FileSelection, actionId: ActionId): boolean =>
  IMPLEMENTED_ACTIONS[selection.type].includes(actionId);

// "Entregar todo en un ZIP" makes sense with 2 or more files and an action that produces one result per file.
export const canBundle = (selection: FileSelection): boolean => {
  const several = selection.files.length >= 2 && BUNDLE_ACTIONS.some((actionId) => isImplemented(selection, actionId));
  const pages   = selection.files.length === 1 && PAGE_BUNDLE_ACTIONS.some((actionId) => isImplemented(selection, actionId));

  return several || pages;
};

// export const canBundle = (selection: FileSelection): boolean =>
//   selection.files.length >= 2 && BUNDLE_ACTIONS.some((actionId) => isImplemented(selection, actionId));

// Whether this action delivers in one zip when the switch is on.
export const usesBundle = (actionId: ActionId): boolean => BUNDLE_ACTIONS.includes(actionId) || PAGE_BUNDLE_ACTIONS.includes(actionId);
