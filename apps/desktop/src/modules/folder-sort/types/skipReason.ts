// Why a file is not moved: a download in progress, hidden or of the system, changed a moment ago, open
// in another program, or changed between the preview and "Ordenar".
export type SkipReason = 'downloading' | 'hidden' | 'recent' | 'in-use' | 'changed';
