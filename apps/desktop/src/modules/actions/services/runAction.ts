import type { RunActionParams } from '@/modules/actions/interfaces/runAction';

// Placeholder until actions are executed in Rust.
export const runAction = async ({ actionId, paths }: RunActionParams): Promise<void> => {
  console.log('Action selected:', actionId, paths);
};
