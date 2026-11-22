export type FileType = 'pdf' | 'image' | 'other';

export type SupportedFileType = Exclude<FileType, 'other'>;

export type DialogFileType = SupportedFileType | 'any';

// Several files of different (or unsupported) kinds: only "Juntar en ZIP" applies.
export type SelectionType = SupportedFileType | 'mixed';

// Actions marked 'any' work with every selection type.
export type ActionFileType = SupportedFileType | 'any';
