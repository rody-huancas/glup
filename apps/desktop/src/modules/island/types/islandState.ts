export type IslandState = 'collapsed' | 'expanded' | 'hidden';

export type VisibleIslandState = Exclude<IslandState, 'hidden'>;
