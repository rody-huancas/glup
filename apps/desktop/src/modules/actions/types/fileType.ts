export type FileType = 'pdf' | 'image' | 'other';

export type SupportedFileType = Exclude<FileType, 'other'>;

export type DialogFileType = SupportedFileType | 'any';

// pdf-mixed: PDFs together with images (they can be merged). mixed: other kinds too, only "Juntar en ZIP".
export type SelectionType = SupportedFileType | 'pdf-mixed' | 'mixed';
// export type SelectionType = SupportedFileType | 'mixed';

// Actions marked 'any' work with every selection type.
export type ActionFileType = SupportedFileType | 'pdf-mixed' | 'any';
