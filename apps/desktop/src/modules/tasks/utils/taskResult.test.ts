import { describe, expect, it } from 'vitest';
import type { ActionReport } from '@/modules/actions/interfaces/actionReport';
import { summaryToResult, toTaskResult } from '@/modules/tasks/utils/taskResult';

describe('task results', () => {
  it('passes a ready result through and summarizes a file report', () => {
    const ready = summaryToResult({ tone: 'success', message: 'Liberaste 3,1 GB', note: null });
    expect(toTaskResult(ready)).toBe(ready);

    const report: ActionReport = {
      actionId       : 'compress',
      outcomes       : [],
      output         : null,
      outputSize     : null,
      total          : 0,
      cancelled      : true,
      bundled        : false,
      outputIsFolder : false,
      pagesDone      : null,
      pagesTotal     : null,
    };
    expect(toTaskResult(report).tone).toBe('calm');
  });
});
