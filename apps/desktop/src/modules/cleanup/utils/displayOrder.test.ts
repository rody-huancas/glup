import { describe, expect, it } from 'vitest';
import type { CleanupCategory } from '@/modules/cleanup/interfaces/cleanupCategory';
import type { CategoryId } from '@/modules/cleanup/types/categoryId';
import { displayOrder } from '@/modules/cleanup/utils/displayOrder';

const category = (id: CategoryId, total: number): CleanupCategory => ({ id, method: 'trash', items: [], total, count: 0, running: [] });

describe('displayOrder', () => {
  it('puts empty categories last and skeletons for the pending ones', () => {
    const order = displayOrder([category('installers', 0), category('temp', 10), category('duplicates', 5)], true);

    expect(order.found.map((item) => item.id)).toEqual(['temp', 'duplicates']);
    expect(order.empty.map((item) => item.id)).toEqual(['installers']);
    expect(order.pending).toEqual(['browsers', 'recycle-bin', 'archives', 'large-files']);
  });

  it('shows no skeletons once the scan is over', () => {
    expect(displayOrder([category('temp', 10)], false).pending).toEqual([]);
  });
});
