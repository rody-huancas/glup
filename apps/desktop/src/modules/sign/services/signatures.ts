import { invoke } from '@tauri-apps/api/core';
import { SIGNATURE_HEADERS } from '@/modules/sign/constants/sign';
import type { SaveSignatureParams } from '@/modules/sign/interfaces/signPdf';
import type { SignatureFile } from '@/modules/sign/interfaces/signature';
import { DELETE_SIGNATURE, LIST_SIGNATURES, SAVE_SIGNATURE } from '@/shared/constants/events';

// Saved signatures live in the app data folder (at most 6); the others only for this signing.
export const listSignatures = (): Promise<SignatureFile[]> => invoke<SignatureFile[]>(LIST_SIGNATURES);

// Raw PNG bytes, without JSON.
export const saveSignature = ({ bytes, keep }: SaveSignatureParams): Promise<SignatureFile> =>
  invoke<SignatureFile>(SAVE_SIGNATURE, bytes, { headers: { [SIGNATURE_HEADERS.keep]: keep ? '1' : '0' } });

export const deleteSignature = (id: string): Promise<void> => invoke(DELETE_SIGNATURE, { id });
