import { invoke } from '@tauri-apps/api/core';
import { OPEN_ISSUES } from '@/shared/constants/events';

// Opens the repository's issues in the browser; the address lives in Rust.
export const openIssues = (): Promise<void> => invoke<void>(OPEN_ISSUES);
