import { invoke } from '@tauri-apps/api/core';
import { GET_ACCOUNT_NAME } from '@/shared/constants/events';

// The name the Windows account shows (null: it has none). Read only in this computer.
export const getAccountName = (): Promise<string | null> => invoke<string | null>(GET_ACCOUNT_NAME);
