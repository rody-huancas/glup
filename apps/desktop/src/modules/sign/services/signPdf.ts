import { invoke } from '@tauri-apps/api/core';
import type { ActionReport } from '@/modules/actions/interfaces/actionReport';
import type { SignPdfParams } from '@/modules/sign/interfaces/signPdf';
import { SIGN_PDF } from '@/shared/constants/events';

// Runs in Rust like any other action: task progress, result and history.
export const signPdf = ({ path, placements, destination, taskId }: SignPdfParams): Promise<ActionReport> =>
  invoke<ActionReport>(SIGN_PDF, { request: { path, placements, destination, taskId } });
