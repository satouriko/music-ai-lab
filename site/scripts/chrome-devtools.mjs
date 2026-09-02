import { readFileSync } from 'node:fs';

const defaultPause = (milliseconds) => new Promise((resolve) => {
  setTimeout(resolve, milliseconds);
});

export async function waitForActivePort(
  activePortPath,
  {
    now = Date.now,
    pause = defaultPause,
    pollMilliseconds = 50,
    readActivePort = (path) => readFileSync(path, 'utf8'),
    timeoutMilliseconds = 30_000,
  } = {},
) {
  const deadline = now() + timeoutMilliseconds;
  while (now() < deadline) {
    try {
      return readActivePort(activePortPath).trim().split('\n')[0];
    } catch {
      await pause(pollMilliseconds);
    }
  }
  throw new Error('Chrome DevTools port did not become ready');
}
