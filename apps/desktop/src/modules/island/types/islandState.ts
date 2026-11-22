export type IslandState = 'collapsed' | 'expanded' | 'hidden';

export type VisibleIslandState = Exclude<IslandState, 'hidden'>;

// export type IslandFlow = 'idle' | 'eating' | 'notice';
