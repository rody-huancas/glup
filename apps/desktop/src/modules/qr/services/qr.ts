import { invoke } from '@tauri-apps/api/core';
import { open, save } from '@tauri-apps/plugin-dialog';
import { QR_CREATE_TEXTS, QR_READ_TEXTS } from '@/modules/qr/constants/texts';
import type { QrContent } from '@/modules/qr/interfaces/qrContent';
import type { QrLogo, QrPreview, QrStyle } from '@/modules/qr/interfaces/qrStyle';
import type { ReadCode } from '@/modules/qr/interfaces/readCode';
import type { QrFormat, WifiSecurity } from '@/modules/qr/types/qrTypes';
import type { SaveDestination } from '@/modules/settings/interfaces/appSettings';
import {
  CONNECT_QR_WIFI,
  COPY_QR,
  OPEN_QR_LINK,
  QR_PREVIEW,
  READ_QR_BYTES,
  READ_QR_CLIPBOARD,
  READ_QR_FILES,
  SAVE_QR,
  SAVE_QR_CONTACT,
  START_SCREEN_QR,
} from '@/shared/constants/events';

export interface QrRequest {
  content : QrContent;
  style   : QrStyle;
  logo    : QrLogo;
}

// The QR as it looks (SVG), and whether Glup's own reader reads it back.
export const qrPreview = (request: QrRequest): Promise<QrPreview> => invoke<QrPreview>(QR_PREVIEW, { request });

interface SaveParams extends QrRequest {
  format      : QrFormat;
  size        : number;
  destination : SaveDestination;
}

export const saveQr = ({ format, size, destination, ...request }: SaveParams): Promise<string> => invoke<string>(SAVE_QR, { request: { ...request, format, size, destination } });

export const copyQr = (request: QrRequest): Promise<void> => invoke(COPY_QR, { request });

export const pickQrLogo = async (): Promise<string | null> => {
  const chosen = await open({ multiple: false, directory: false, title: QR_CREATE_TEXTS.pickTitle, filters: [{ name: QR_CREATE_TEXTS.pickFilter, extensions: ['png'] }] });
  return typeof chosen === 'string' ? chosen : null;
};

export interface FileCodes {
  path  : string;
  name  : string;
  codes : ReadCode[];
  error : string | null;
}

export const readQrFiles = (paths: string[]): Promise<FileCodes[]> => invoke<FileCodes[]>(READ_QR_FILES, { paths });

// A page of a PDF drawn here, as raw PNG bytes.
export const readQrBytes = (bytes: Uint8Array): Promise<ReadCode[]> => invoke<ReadCode[]>(READ_QR_BYTES, bytes);

export const readQrClipboard = (): Promise<ReadCode[]> => invoke<ReadCode[]>(READ_QR_CLIPBOARD);

export const startScreenQr = (): Promise<void> => invoke(START_SCREEN_QR);

export const pickCodeFiles = async (): Promise<string[]> => {
  const chosen = await open({ multiple: true, directory: false, title: QR_READ_TEXTS.pickTitle, filters: [{ name: QR_READ_TEXTS.pickFilter, extensions: ['png', 'jpg', 'jpeg', 'webp', 'gif', 'bmp', 'tif', 'tiff', 'heic', 'heif', 'avif', 'pdf'] }] });
  return Array.isArray(chosen) ? chosen : typeof chosen === 'string' ? [chosen] : [];
};

// «Guardar contacto»: where the person says, as a .vcf.
export const saveQrContact = async (vcard: string, name: string): Promise<boolean> => {
  const path = await save({ defaultPath: name, filters: [{ name: QR_READ_TEXTS.vcfFilter, extensions: ['vcf'] }] });
  if (!path) return false;
  await invoke(SAVE_QR_CONTACT, { path, vcard });
  return true;
};

interface WifiParams {
  ssid     : string;
  password : string;
  security : WifiSecurity;
  hidden   : boolean;
}

export const connectQrWifi = (request: WifiParams): Promise<void> => invoke(CONNECT_QR_WIFI, { request });

// Only when the person asks, and only web links.
export const openQrLink = (url: string): Promise<void> => invoke(OPEN_QR_LINK, { url });
