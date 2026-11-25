import { ACTIONS } from '@/modules/actions/constants/actions';
import type { RunActionOptions } from '@/modules/actions/interfaces/runAction';
import { runAction } from '@/modules/actions/services/runAction';
import type { ActionId } from '@/modules/actions/types/actionId';
import { getFileName } from '@/modules/actions/utils/paths';
import type { SaveLocation } from '@/modules/settings/interfaces/saveLocation';
import { enqueueTask } from '@/modules/tasks/store/taskStore';

interface QueueParams {
  actionId : ActionId;
  paths    : string[];
  options  : RunActionOptions;
  location : SaveLocation;
}

// What a screen of Imágenes saves: an action on its photos, as a task (progress, Cancelar, ZIP).
export const queuePhotos = ({ actionId, paths, options, location }: QueueParams) => {
  const label = ACTIONS.find((action) => action.id === actionId)?.label ?? '';
  const name  = paths.length === 1 ? getFileName(paths[0]) : `${paths.length} fotos`;
  enqueueTask({
    title     : `${label} · ${name}`,
    actionId,
    type      : 'image',
    fileCount : paths.length,
    owner     : 'home',
    run       : ({ taskId }) => runAction({ actionId, paths, options: { ...options, destination: location.destination, bundle: paths.length > 1 && location.bundleZip }, taskId }),
  });
};
