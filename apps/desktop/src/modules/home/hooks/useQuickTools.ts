// Replaced by HomeFiles.runTool, which shows the result in the panel.
// import { useCallback } from 'react';
// import { pickFiles } from '@/modules/actions/services/fileDialog';
// import { runAction } from '@/modules/actions/services/runAction';
// import type { QuickTool } from '@/modules/home/interfaces/quickTool';
//
// export const useQuickTools = () => {
//   const runTool = useCallback(async ({ actionId, fileType, multiple }: QuickTool) => {
//     const paths = await pickFiles({ type: fileType, multiple });
//     if (paths.length > 0) await runAction({ actionId, paths });
//   }, []);
//
//   return { runTool };
// };
export {};
