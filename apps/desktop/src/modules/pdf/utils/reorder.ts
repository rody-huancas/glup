interface MoveParams<T> {
  items : T[];
  from  : number;
  to    : number;
}

// Moves one item to a new index, keeping the rest in order.
export const moveItem = <T,>({ items, from, to }: MoveParams<T>): T[] => {
  if (from === to || from < 0 || from >= items.length) return items;

  const next     = [...items];
  const [picked] = next.splice(from, 1);
  next.splice(Math.max(0, Math.min(to, next.length)), 0, picked);
  return next;
};
