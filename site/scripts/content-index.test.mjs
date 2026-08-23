import assert from 'node:assert/strict';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import {
  createContentBundle,
  extractMarkdownTitle,
  parseNotebook,
} from './content-index.mjs';

test('extractMarkdownTitle uses the first heading and falls back to the filename', () => {
  assert.equal(
    extractMarkdownTitle('intro.md', 'preface\n# Visible title\n'),
    'Visible title',
  );
  assert.equal(extractMarkdownTitle('intro.md', 'text only'), 'intro');
});

test('createContentBundle scans only approved roots with stable paths', async () => {
  const root = await mkdtemp(join(tmpdir(), 'music-ai-content-'));

  try {
    await mkdir(join(root, 'roadmap'), { recursive: true });
    await mkdir(join(root, 'docs/weekly'), { recursive: true });
    await mkdir(join(root, 'docs/code-reading'), { recursive: true });
    await mkdir(join(root, 'learning/topic'), { recursive: true });
    await mkdir(join(root, 'projects/demo'), { recursive: true });
    await mkdir(join(root, 'tests'), { recursive: true });
    await mkdir(join(root, 'notebooks'), { recursive: true });

    await writeFile(
      join(root, 'roadmap/roadmap.json'),
      JSON.stringify({
        weeks: [],
        phases: [],
        categories: [],
        extensionPaths: [],
      }),
    );
    await writeFile(
      join(root, 'roadmap/artifacts.json'),
      JSON.stringify({
        artifacts: [{
          id: 'week-34',
          kind: 'note',
          title: 'Week 34',
          summary: 'A weekly note.',
          weeks: [1],
          categoryIds: [],
          path: 'docs/weekly/2026-W34.md',
        }],
      }),
    );
    await writeFile(
      join(root, 'docs/weekly/2026-W34.md'),
      '# Week 34\n',
    );
    await writeFile(
      join(root, 'docs/code-reading/README.md'),
      '# Code Reading\n',
    );
    await writeFile(
      join(root, 'learning/topic/train.py'),
      'print("ok")\n',
    );
    await writeFile(
      join(root, 'projects/demo/main.py'),
      'print("project")\n',
    );
    await writeFile(join(root, 'tests/test_demo.py'), 'def test_demo(): pass\n');
    await writeFile(join(root, 'secret.py'), 'do_not_publish = True\n');

    const bundle = await createContentBundle(root);

    assert.deepEqual(
      bundle.notes.map((item) => item.path),
      ['docs/weekly/2026-W34.md'],
    );
    assert.deepEqual(
      bundle.code.map((item) => item.path),
      [
        'learning/topic/train.py',
        'projects/demo/main.py',
        'tests/test_demo.py',
      ],
    );
    assert.equal(bundle.notes[0].title, 'Week 34');
    assert.equal(bundle.code[0].title, 'train.py');
    assert.deepEqual(bundle.notebooks, []);
    assert.equal(bundle.artifacts[0].id, 'week-34');
    assert.equal(JSON.stringify(bundle).includes('secret.py'), false);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('createContentBundle names malformed artifact input', async () => {
  const root = await mkdtemp(join(tmpdir(), 'music-ai-content-'));

  try {
    await mkdir(join(root, 'roadmap'), { recursive: true });
    await writeFile(
      join(root, 'roadmap/roadmap.json'),
      JSON.stringify({
        weeks: [],
        phases: [],
        categories: [],
        extensionPaths: [],
      }),
    );
    await writeFile(join(root, 'roadmap/artifacts.json'), '{broken');

    await assert.rejects(
      createContentBundle(root),
      /roadmap\/artifacts\.json/,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('createContentBundle names malformed roadmap input', async () => {
  const root = await mkdtemp(join(tmpdir(), 'music-ai-content-'));

  try {
    await mkdir(join(root, 'roadmap'), { recursive: true });
    await writeFile(join(root, 'roadmap/roadmap.json'), '{broken');

    await assert.rejects(
      createContentBundle(root),
      /roadmap\/roadmap\.json/,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('createContentBundle rejects bare TeX spacing commands inside math', async () => {
  const root = await mkdtemp(join(tmpdir(), 'music-ai-content-'));

  try {
    await mkdir(join(root, 'roadmap'), { recursive: true });
    await mkdir(join(root, 'docs/weekly'), { recursive: true });
    await writeFile(
      join(root, 'roadmap/roadmap.json'),
      JSON.stringify({
        weeks: [],
        phases: [],
        categories: [],
        extensionPaths: [],
      }),
    );
    await writeFile(
      join(root, 'roadmap/artifacts.json'),
      JSON.stringify({ artifacts: [] }),
    );
    await writeFile(
      join(root, 'docs/weekly/2026-W34.md'),
      '$$\nz_1=W_1x+b_1,qquad h_1=\\operatorname{ReLU}(z_1)\n$$\n',
    );

    await assert.rejects(
      createContentBundle(root),
      /docs\/weekly\/2026-W34\.md: malformed TeX spacing command qquad/,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('createContentBundle normalizes saved notebook cells without executable HTML', async () => {
  const root = await mkdtemp(join(tmpdir(), 'music-ai-content-'));

  try {
    await mkdir(join(root, 'roadmap'), { recursive: true });
    await mkdir(join(root, 'notebooks'), { recursive: true });
    await writeFile(
      join(root, 'roadmap/roadmap.json'),
      JSON.stringify({
        weeks: [],
        phases: [],
        categories: [],
        extensionPaths: [],
      }),
    );
    await writeFile(
      join(root, 'roadmap/artifacts.json'),
      JSON.stringify({ artifacts: [] }),
    );
    await writeFile(
      join(root, 'notebooks/demo.ipynb'),
      JSON.stringify({
        nbformat: 4,
        nbformat_minor: 5,
        metadata: { kernelspec: { language: 'python' } },
        cells: [
          {
            cell_type: 'markdown',
            metadata: {},
            source: ['# Demo notebook\n', 'Explanation'],
          },
          {
            cell_type: 'code',
            metadata: {},
            source: ['print("ok")'],
            execution_count: 3,
            outputs: [
              { output_type: 'stream', name: 'stdout', text: ['ok\n'] },
              {
                output_type: 'error',
                ename: 'ValueError',
                evalue: 'bad',
                traceback: ['trace line 1', 'trace line 2'],
              },
              {
                output_type: 'display_data',
                data: { 'image/png': 'AAAA' },
                metadata: {},
              },
              {
                output_type: 'execute_result',
                data: { 'text/plain': ['42\n'] },
                execution_count: 3,
                metadata: {},
              },
              {
                output_type: 'display_data',
                data: { 'image/jpeg': 'BBBB' },
                metadata: {},
              },
              {
                output_type: 'display_data',
                data: { 'text/html': '<script>bad()</script>' },
                metadata: {},
              },
            ],
          },
          {
            cell_type: 'raw',
            metadata: {},
            source: ['raw content'],
          },
        ],
      }),
    );

    const bundle = await createContentBundle(root);
    const notebook = bundle.notebooks[0];

    assert.equal(notebook.path, 'notebooks/demo.ipynb');
    assert.equal(notebook.title, 'Demo notebook');
    assert.equal(notebook.cells[0].source, '# Demo notebook\nExplanation');
    assert.equal(notebook.cells[1].executionCount, 3);
    assert.deepEqual(
      notebook.cells[1].outputs.map((output) => output.kind),
      ['text', 'error', 'image', 'text', 'image', 'unsupported'],
    );
    assert.equal(notebook.cells[1].outputs[0].text, 'ok\n');
    assert.equal(notebook.cells[1].outputs[1].traceback, 'trace line 1\ntrace line 2');
    assert.equal(notebook.cells[1].outputs[3].text, '42\n');
    assert.equal(notebook.cells[1].outputs[4].mimeType, 'image/jpeg');
    assert.deepEqual(notebook.cells[1].outputs[5].mimeTypes, ['text/html']);
    assert.equal(notebook.cells[2].kind, 'raw');
    assert.equal(notebook.cells[2].source, 'raw content');
    assert.equal(JSON.stringify(notebook).includes('<script>'), false);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('parseNotebook rejects a notebook without a cells array', () => {
  assert.throws(
    () => parseNotebook('notebooks/missing-cells.ipynb', '{"nbformat":4}'),
    /notebooks\/missing-cells\.ipynb: cells must be an array/,
  );
});

test('createContentBundle names a malformed notebook path', async () => {
  const root = await mkdtemp(join(tmpdir(), 'music-ai-content-'));

  try {
    await mkdir(join(root, 'roadmap'), { recursive: true });
    await mkdir(join(root, 'notebooks'), { recursive: true });
    await writeFile(
      join(root, 'roadmap/roadmap.json'),
      JSON.stringify({
        weeks: [],
        phases: [],
        categories: [],
        extensionPaths: [],
      }),
    );
    await writeFile(
      join(root, 'roadmap/artifacts.json'),
      JSON.stringify({ artifacts: [] }),
    );
    await writeFile(join(root, 'notebooks/broken.ipynb'), '{broken');

    await assert.rejects(
      createContentBundle(root),
      /notebooks\/broken\.ipynb/,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
