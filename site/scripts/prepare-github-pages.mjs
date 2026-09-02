import { mkdir, readdir, rename, rm, writeFile } from 'node:fs/promises';
import { extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const clientRoot = fileURLToPath(new URL('../dist/client/', import.meta.url));
const basePath = (process.env.NEXT_PUBLIC_BASE_PATH ?? '')
  .replace(/^\/+|\/+$/g, '');

async function prepareFiles(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const absolutePath = join(directory, entry.name);
    if (entry.isDirectory()) {
      await prepareFiles(absolutePath);
    } else if (
      entry.isFile()
      && extname(entry.name) === '.html'
      && entry.name !== 'index.html'
      && entry.name !== '404.html'
    ) {
      const routeDirectory = absolutePath.slice(0, -'.html'.length);
      await mkdir(routeDirectory, { recursive: true });
      await rename(absolutePath, join(routeDirectory, 'index.html'));
    }
  }
}

await prepareFiles(clientRoot);
if (basePath) {
  const basePathRoot = join(clientRoot, basePath);
  for (const entry of await readdir(basePathRoot, { withFileTypes: true })) {
    await rename(
      join(basePathRoot, entry.name),
      join(clientRoot, entry.name),
    );
  }
  await rm(join(clientRoot, basePath), { recursive: true });
}
await Promise.all([
  rm(join(clientRoot, '.assetsignore'), { force: true }),
  rm(join(clientRoot, '_headers'), { force: true }),
  rm(join(clientRoot, '.vite'), { force: true, recursive: true }),
  writeFile(join(clientRoot, '.nojekyll'), ''),
]);

process.stdout.write('Prepared static export for GitHub Pages.\n');
