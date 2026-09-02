import assert from 'node:assert/strict';
import test from 'node:test';

import { waitForActivePort } from './chrome-devtools.mjs';

test('waits through a seven-second CI Chrome startup', async () => {
  let elapsedMilliseconds = 0;

  const port = await waitForActivePort('/unused/DevToolsActivePort', {
    now: () => elapsedMilliseconds,
    pause: async (milliseconds) => {
      elapsedMilliseconds += milliseconds;
    },
    readActivePort: () => {
      if (elapsedMilliseconds < 7_000) {
        const error = new Error('DevToolsActivePort is not ready');
        error.code = 'ENOENT';
        throw error;
      }
      return '43117\n/devtools/browser/example';
    },
  });

  assert.equal(port, '43117');
  assert.equal(elapsedMilliseconds, 7_000);
});
