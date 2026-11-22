import type { ActionResult } from '@/modules/actions/interfaces/actionResult';
import { openFile, revealFile } from '@/modules/actions/services/files';

export const openResult = (result: ActionResult) => {
  if (result.openPath) void openFile(result.openPath);
};

// A folder of results opens; a single file shows selected in its folder.
export const revealResult = (result: ActionResult) => {
  if (!result.revealPath) return;
  void (result.revealOpens ? openFile(result.revealPath) : revealFile(result.revealPath));
};
