interface DeferredCommitParams<T> {
  // After the last change with nothing pressed (the arrows of the keyboard), how long to wait (ms).
  delay    : number;
  commit   : (value: T) => void;
  // What is waiting changed (null: nothing waits any more).
  onChange : (value: T | null) => void;
}

// A value that is shown at once but applied only once. While pressed (the slider or the marker held
// down) it never applies, however long the pause: only on release. Not pressed (the arrows), it applies
// after a short pause with no more changes. Moving the real island on every step would pull the panel
// from under the cursor.
export const createDeferredCommit = <T>({ delay, commit, onChange }: DeferredCommitParams<T>) => {
  let pending: { value: T } | null = null;
  let pressed                      = false;
  let timer: ReturnType<typeof setTimeout> | undefined;

  const stop = () => {
    clearTimeout(timer);
    timer = undefined;
  };

  // Let go: applied now, if something waits.
  const release = () => {
    stop();
    pressed = false;
    if (!pending) return;
    const { value } = pending;
    pending         = null;
    commit(value);
    onChange(null);
  };

  // Held down: nothing applies until release.
  const press = () => {
    stop();
    pressed = true;
  };

  const hold = (value: T) => {
    pending = { value };
    onChange(value);
    stop();
    if (!pressed) timer = setTimeout(release, delay);
  };

  // Dropped without applying it.
  const cancel = () => {
    stop();
    pressed = false;
    pending = null;
    onChange(null);
  };

  return { hold, press, release, cancel, waiting: () => pending !== null, pressed: () => pressed };
};
