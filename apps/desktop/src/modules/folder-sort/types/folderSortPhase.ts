// idle: nothing reviewed · previewing: reading the folder · ready: the preview, waiting for "Ordenar" ·
// sorting: moving · done: the result, with "Deshacer".
export type FolderSortPhase = 'idle' | 'previewing' | 'ready' | 'sorting' | 'done';
