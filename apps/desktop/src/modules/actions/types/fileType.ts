export type FileType = 'pdf' | 'image' | 'other';

export type SupportedFileType = Exclude<FileType, 'other'>;

export type DialogFileType = SupportedFileType | 'any';
