import { invoke } from '@tauri-apps/api/core';
import type { ActionReport } from '@/modules/actions/interfaces/actionReport';
import type { RunActionParams } from '@/modules/actions/interfaces/runAction';
import { CANCEL_ACTION, RUN_ACTION } from '@/shared/constants/events';

// Runs in Rust on a worker thread; progress arrives through ACTION_PROGRESS_EVENT.
export const runAction = ({ actionId, paths, options, taskId }: RunActionParams): Promise<ActionReport> =>
  invoke<ActionReport>(RUN_ACTION, { request: { actionId, paths, options: options ?? null, taskId: taskId ?? null } });

// The file in progress finishes; the rest are skipped and the report comes back cancelled.
export const cancelAction = (): Promise<void> => invoke(CANCEL_ACTION);

// Placeholder until actions are executed in Rust.
// export const runAction = async ({ actionId, paths }: RunActionParams): Promise<void> => {
//   console.log('Action selected:', actionId, paths);
// };
