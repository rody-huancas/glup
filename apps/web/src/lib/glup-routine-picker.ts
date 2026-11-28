// Which little routine the hero's Glup plays next while it rests, and how long it waits before it.
export const ROUTINES = ['wave', 'walk', 'headphones', 'dance', 'stretch', 'lick', 'eat'] as const;

export type RoutineName = (typeof ROUTINES)[number];

// Seconds of rest between two routines.
export const ROUTINE_REST = { min: 6, max: 12 } as const;

interface IPickRoutineParams {
  last   : RoutineName | null;
  random : () => number;
}

export const isRoutine = (value: string | null): value is RoutineName =>
  ROUTINES.some((routine) => routine === value);

// Any routine but the one just played, so the same never comes twice in a row.
export const pickRoutine = ({ last, random }: IPickRoutineParams): RoutineName => {
  const choices = ROUTINES.filter((routine) => routine !== last);
  const index   = Math.min(choices.length - 1, Math.floor(random() * choices.length));

  return choices[index];
};

export const routineRest = (random: () => number): number =>
  ROUTINE_REST.min + random() * (ROUTINE_REST.max - ROUTINE_REST.min);
