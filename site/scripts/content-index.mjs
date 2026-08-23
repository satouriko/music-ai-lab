import { readFile, readdir } from 'node:fs/promises';
import { basename, extname, isAbsolute, relative, resolve, sep } from 'node:path';

const NOTE_ROOTS = ['docs/weekly', 'docs/code-reading'];
const CODE_ROOTS = ['learning', 'projects', 'tests'];
const NOTE_EXTENSIONS = new Set(['.md']);
const CODE_EXTENSIONS = new Set(['.py']);
const NOTEBOOK_EXTENSIONS = new Set(['.ipynb']);
const NOTE_COLLECTION_FILES = new Set([
  'docs/code-reading/README.md',
  'docs/weekly/README.md',
]);

function toPosixPath(path) {
  return path.split(sep).join('/');
}

function assertWithin(parent, candidate) {
  const childPath = relative(parent, candidate);
  if (childPath === '..' || childPath.startsWith(`..${sep}`) || isAbsolute(childPath)) {
    throw new Error(`content path escapes repository root: ${candidate}`);
  }
}

export function extractMarkdownTitle(filePath, source) {
  const heading = source.match(/^#\s+(.+?)\s*$/m);
  if (heading) return heading[1].trim();
  return basename(filePath, extname(filePath));
}

function stripFencedCode(source) {
  let fence = null;

  return source
    .split('\n')
    .map((line) => {
      const match = line.match(/^\s*([`~]{3,})/);
      if (match) {
        const marker = match[1][0];
        if (fence === null) {
          fence = { marker, length: match[1].length };
        } else if (marker === fence.marker && match[1].length >= fence.length) {
          fence = null;
        }
        return '';
      }
      return fence === null ? line : '';
    })
    .join('\n');
}

export function assertValidMarkdownMath(filePath, source) {
  const markdown = stripFencedCode(source);
  const expressions = [
    ...markdown.matchAll(/\$\$([\s\S]*?)\$\$/g),
    ...markdown.matchAll(/\\\[([\s\S]*?)\\\]/g),
    ...markdown.matchAll(/(?<!\\)\$(?!\$)([^\n$]+?)(?<!\\)\$/g),
  ];

  for (const expression of expressions) {
    const malformed = expression[1].match(/(?<!\\)\b(qquad|quad)\b/);
    if (malformed) {
      throw new Error(
        `${filePath}: malformed TeX spacing command ${malformed[1]}; expected \\${malformed[1]}`,
      );
    }
  }
}

export function normalizeSource(source) {
  if (Array.isArray(source)) return source.join('');
  return typeof source === 'string' ? source : '';
}

export function normalizeNotebookOutput(output) {
  if (output?.output_type === 'stream') {
    return { kind: 'text', text: normalizeSource(output.text) };
  }

  if (output?.output_type === 'error') {
    return {
      kind: 'error',
      name: typeof output.ename === 'string' ? output.ename : 'Error',
      value: typeof output.evalue === 'string' ? output.evalue : '',
      traceback: Array.isArray(output.traceback)
        ? output.traceback.join('\n')
        : normalizeSource(output.traceback),
    };
  }

  if (
    output?.output_type === 'execute_result'
    || output?.output_type === 'display_data'
  ) {
    const data = output.data && typeof output.data === 'object'
      ? output.data
      : {};
    if (data['image/png']) {
      return {
        kind: 'image',
        mimeType: 'image/png',
        data: normalizeSource(data['image/png']),
      };
    }
    if (data['image/jpeg']) {
      return {
        kind: 'image',
        mimeType: 'image/jpeg',
        data: normalizeSource(data['image/jpeg']),
      };
    }
    if (data['text/plain']) {
      return { kind: 'text', text: normalizeSource(data['text/plain']) };
    }
    return { kind: 'unsupported', mimeTypes: Object.keys(data).sort() };
  }

  return {
    kind: 'unsupported',
    mimeTypes: output?.output_type ? [String(output.output_type)] : [],
  };
}

export function parseNotebook(filePath, source) {
  let raw;
  try {
    raw = JSON.parse(source);
  } catch (error) {
    throw new Error(`unable to parse ${filePath}: ${error.message}`, {
      cause: error,
    });
  }

  if (!Array.isArray(raw.cells)) {
    throw new Error(`unable to parse ${filePath}: cells must be an array`);
  }

  const cells = raw.cells.map((cell) => {
    const kind = ['markdown', 'code', 'raw'].includes(cell?.cell_type)
      ? cell.cell_type
      : 'raw';
    return {
      kind,
      source: normalizeSource(cell?.source),
      executionCount: kind === 'code' && Number.isInteger(cell?.execution_count)
        ? cell.execution_count
        : null,
      outputs: kind === 'code' && Array.isArray(cell?.outputs)
        ? cell.outputs.map(normalizeNotebookOutput)
        : [],
    };
  });
  const markdownSource = cells
    .filter((cell) => cell.kind === 'markdown')
    .map((cell) => cell.source)
    .join('\n');

  return {
    path: filePath,
    title: extractMarkdownTitle(filePath, markdownSource),
    section: 'notebooks',
    cells,
  };
}

export async function collectFiles(root, extensions) {
  const absoluteRoot = resolve(root);
  const files = [];

  async function visit(directory) {
    let entries;
    try {
      entries = await readdir(directory, { withFileTypes: true });
    } catch (error) {
      if (error?.code === 'ENOENT') return;
      throw error;
    }

    entries.sort((left, right) => left.name.localeCompare(right.name));

    for (const entry of entries) {
      const absolutePath = resolve(directory, entry.name);
      assertWithin(absoluteRoot, absolutePath);

      if (entry.isDirectory()) {
        await visit(absolutePath);
      } else if (entry.isFile() && extensions.has(extname(entry.name).toLowerCase())) {
        files.push({
          path: toPosixPath(relative(absoluteRoot, absolutePath)),
          source: await readFile(absolutePath, 'utf8'),
        });
      }
    }
  }

  await visit(absoluteRoot);
  return files.sort((left, right) => left.path.localeCompare(right.path));
}

async function collectDocuments(repoRoot, roots, extensions, createDocument) {
  const documents = [];

  for (const sourceRoot of roots) {
    const absoluteRoot = resolve(repoRoot, sourceRoot);
    assertWithin(repoRoot, absoluteRoot);
    const files = await collectFiles(absoluteRoot, extensions);

    for (const file of files) {
      const repositoryPath = `${sourceRoot}/${file.path}`;
      documents.push(createDocument(repositoryPath, sourceRoot, file.source));
    }
  }

  return documents.sort((left, right) => left.path.localeCompare(right.path));
}

export async function createContentBundle(repoRoot) {
  const absoluteRepoRoot = resolve(repoRoot);
  const roadmapPath = resolve(absoluteRepoRoot, 'roadmap/roadmap.json');
  const artifactsPath = resolve(absoluteRepoRoot, 'roadmap/artifacts.json');
  assertWithin(absoluteRepoRoot, roadmapPath);
  assertWithin(absoluteRepoRoot, artifactsPath);

  let roadmap;
  try {
    roadmap = JSON.parse(await readFile(roadmapPath, 'utf8'));
  } catch (error) {
    throw new Error(`unable to parse roadmap/roadmap.json: ${error.message}`, {
      cause: error,
    });
  }

  let artifacts;
  try {
    const artifactSource = JSON.parse(await readFile(artifactsPath, 'utf8'));
    artifacts = artifactSource.artifacts;
  } catch (error) {
    throw new Error(`unable to parse roadmap/artifacts.json: ${error.message}`, {
      cause: error,
    });
  }

  const notes = (await collectDocuments(
    absoluteRepoRoot,
    NOTE_ROOTS,
    NOTE_EXTENSIONS,
    (path, section, source) => {
      assertValidMarkdownMath(path, source);
      return {
        path,
        title: extractMarkdownTitle(path, source),
        section,
        source,
      };
    },
  )).filter((document) => !NOTE_COLLECTION_FILES.has(document.path));

  const code = await collectDocuments(
    absoluteRepoRoot,
    CODE_ROOTS,
    CODE_EXTENSIONS,
    (path, section, source) => ({
      path,
      title: basename(path),
      section,
      language: 'python',
      source,
    }),
  );

  const notebookFiles = await collectFiles(
    resolve(absoluteRepoRoot, 'notebooks'),
    NOTEBOOK_EXTENSIONS,
  );
  const notebooks = notebookFiles.map((file) => {
    const repositoryPath = `notebooks/${file.path}`;
    return parseNotebook(repositoryPath, file.source);
  });

  return { roadmap, artifacts, notes, code, notebooks };
}
