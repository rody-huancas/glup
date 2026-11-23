export type FileType = 'pdf' | 'image' | 'video' | 'audio' | 'other';

export type SupportedFileType = Exclude<FileType, 'other'>;

// 'files': any file at all (Juntar en ZIP takes every kind).
export type DialogFileType = SupportedFileType | 'any' | 'files';

// pdf-mixed: PDFs together with images (they can be merged). mixed: other kinds too, only "Juntar en ZIP".
// pdf-locked: one PDF that needs a password to open (only "Quitar contraseña").
export type SelectionType = SupportedFileType | 'pdf-mixed' | 'pdf-locked' | 'mixed';

// Actions marked 'any' work with every selection type.
export type ActionFileType = SupportedFileType | 'pdf-mixed' | 'pdf-locked' | 'any';
