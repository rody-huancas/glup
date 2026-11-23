import { describe, expect, it } from 'vitest';
import type { Task } from '@/modules/tasks/interfaces/task';
import { ownerOfAction, pickOpenPage, pickRevealPage, tasksForPage } from '@/modules/tasks/utils/taskOwner';
import { getVisibleTask } from '@/modules/tasks/utils/taskView';

const task = (id: string, owner: Task['owner'], status: Task['status'], createdAt = 0): Task => ({
  id,
  owner,
  status,
  title      : id,
  actionId   : null,
  type       : null,
  fileCount  : 1,
  progress   : null,
  result     : null,
  cancelling : false,
  finishedAt : null,
  createdAt,
});

const MINUTE = 60 * 1000;
const BASE   = { dragging: false, reveals: [], pending: false, tasks: [], current: 'history' as const, collapsedAt: 0, now: MINUTE, lifetime: 10 * MINUTE };

describe('task owners', () => {
  it('knows the owner of restored tasks from their action', () => {
    expect(ownerOfAction('cleanup-scan')).toBe('cleanup');
    expect(ownerOfAction('cleanup')).toBe('cleanup');
    expect(ownerOfAction('compress')).toBe('home');
  });

  it('shows on Inicio only its own tasks', () => {
    const tasks = [task('scan', 'cleanup', 'done'), task('reduce', 'home', 'queued'), task('sign', 'home', 'done')];
    const home  = tasksForPage(tasks, 'home');

    expect(home.map((item) => item.id)).toEqual(['reduce', 'sign']);
    expect(getVisibleTask(home)?.id).toBe('sign');
    expect(getVisibleTask(tasksForPage([task('scan', 'cleanup', 'done')], 'home'))).toBeNull();
  });

  it('opens the owner of the most recent task that finished while collapsed', () => {
    expect(pickRevealPage([])).toBeNull();
    expect(pickRevealPage([{ owner: 'home', finishedAt: 10 }, { owner: 'cleanup', finishedAt: 20 }])).toBe('cleanup');
    expect(pickRevealPage([{ owner: 'cleanup', finishedAt: 20 }, { owner: 'home', finishedAt: 30 }])).toBe('home');
  });

  describe('pickOpenPage', () => {
    it('goes to Inicio while a file is dragged, whatever else is pending', () => {
      expect(pickOpenPage({ ...BASE, dragging: true, reveals: [{ owner: 'cleanup', finishedAt: 5 }] })).toBe('home');
    });

    it('prefers a finished task not seen yet, then the most recent task in progress', () => {
      const tasks = [task('reduce', 'home', 'running', 10), task('scan', 'cleanup', 'queued', 20)];

      expect(pickOpenPage({ ...BASE, tasks, reveals: [{ owner: 'home', finishedAt: 30 }] })).toBe('home');
      expect(pickOpenPage({ ...BASE, tasks })).toBe('cleanup');
      expect(pickOpenPage({ ...BASE, tasks: [task('scan', 'cleanup', 'done', 20)] })).toBe('history');
    });

    it('brings back a pending file selection after unseen results and before tasks in progress', () => {
      const tasks = [task('scan', 'cleanup', 'running', 10)];

      expect(pickOpenPage({ ...BASE, tasks, pending: true })).toBe('home');
      expect(pickOpenPage({ ...BASE, tasks, pending: true, reveals: [{ owner: 'cleanup', finishedAt: 5 }] })).toBe('cleanup');
    });

    it('returns to the last section, or to Inicio after 10 minutes', () => {
      expect(pickOpenPage(BASE)).toBe('history');
      expect(pickOpenPage({ ...BASE, now: 11 * MINUTE })).toBe('home');
      expect(pickOpenPage({ ...BASE, collapsedAt: null, now: 99 * MINUTE })).toBe('history');
    });
  });
});
