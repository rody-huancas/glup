import { invoke } from '@tauri-apps/api/core';
import { CHECK_PDF_PASSWORD } from '@/shared/constants/events';

interface CheckPasswordParams {
  path     : string;
  password : string;
}

// True when the password opens the PDF. Rust only compares it; it is never kept.
export const checkPdfPassword = ({ path, password }: CheckPasswordParams): Promise<boolean> =>
  invoke<boolean>(CHECK_PDF_PASSWORD, { request: { path, password } });
