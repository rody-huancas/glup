import { describe, expect, it, vi } from 'vitest';
import { openOnLaunch } from '@/modules/island/utils/launchOpen';

// Like take_launch_open in Rust: true once, then false.
const onceTake = () => {
  let pending = true;

  return () => {
    const first = pending;
    pending     = false;
    return Promise.resolve(first);
  };
};

describe('openOnLaunch', () => {
  it('expands only once when the hook mounts twice in the same process', async () => {
    const take   = onceTake();
    const onOpen = vi.fn();

    await openOnLaunch({ take, onOpen });
    await openOnLaunch({ take, onOpen });

    expect(onOpen).toHaveBeenCalledTimes(1);
  });

  it('does not expand when Windows launched it or the command fails', async () => {
    const onOpen = vi.fn();

    await openOnLaunch({ take: () => Promise.resolve(false), onOpen });
    await openOnLaunch({ take: () => Promise.reject(new Error('no')), onOpen });

    expect(onOpen).not.toHaveBeenCalled();
  });
});
