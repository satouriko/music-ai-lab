import { readdir, rename } from 'node:fs/promises';
import { extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const clientRoot = fileURLToPath(new URL('../dist/client/', import.meta.url));
const DOCUMENT_SUFFIX = '.document.html';

async function collectHtmlDocuments(directory) {
  const documents = [];

  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const absolutePath = join(directory, entry.name);
    if (entry.isDirectory()) {
      documents.push(...await collectHtmlDocuments(absolutePath));
      continue;
    }

    if (
      entry.isFile()
      && extname(entry.name) === '.html'
      && entry.name !== '404.html'
      && !entry.name.endsWith(DOCUMENT_SUFFIX)
    ) {
      documents.push(absolutePath);
    }
  }

  return documents;
}

const documents = await collectHtmlDocuments(clientRoot);
if (documents.length === 0) {
  throw new Error('Vinext did not emit any prerendered HTML documents');
}

await Promise.all(documents.map(async (sourcePath) => {
  const targetPath = sourcePath.replace(/\.html$/, DOCUMENT_SUFFIX);
  await rename(sourcePath, targetPath);
}));

process.stdout.write(
  `Prepared ${documents.length} prerendered documents for Sites Worker dispatch.\n`,
);
