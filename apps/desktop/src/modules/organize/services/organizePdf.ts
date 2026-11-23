import { invoke } from '@tauri-apps/api/core';
import type { ActionReport } from '@/modules/actions/interfaces/actionReport';
import type { OrganizeRequestPage } from '@/modules/organize/interfaces/organizeRequest';
import type { SaveDestination } from '@/modules/settings/interfaces/appSettings';
import { ORGANIZE_PDF } from '@/shared/constants/events';

interface OrganizePdfParams {
  path        : string;
  pages       : OrganizeRequestPage[];
  destination : SaveDestination;
  taskId      : string;
}

// Runs in Rust like any other action: task progress, result and history.
export const organizePdf = ({ path, pages, destination, taskId }: OrganizePdfParams): Promise<ActionReport> =>
  invoke<ActionReport>(ORGANIZE_PDF, { request: { path, pages, destination, taskId } });
