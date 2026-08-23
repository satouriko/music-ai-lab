import assert from 'node:assert/strict';
import test from 'node:test';

import type { Artifact } from './artifact-types';
import type { GeneratedContent } from './content-types';
import { artifactPresentation } from './artifact-presentation';

const content = {
  notes: [{
    path: 'docs/weekly/note.md',
    title: 'Note',
    section: 'docs/weekly',
    source: '# Note',
  }],
  code: [
    {
      path: 'learning/demo/main.py',
      title: 'main.py',
      section: 'learning',
      language: 'python',
      source: 'print("demo")',
    },
    {
      path: 'learning/demo/test_main.py',
      title: 'test_main.py',
      section: 'learning',
      language: 'python',
      source: 'def test_demo(): pass',
    },
  ],
  notebooks: [],
} satisfies Pick<GeneratedContent, 'notes' | 'code' | 'notebooks'>;

const base = {
  title: 'Artifact',
  summary: 'Artifact summary.',
  weeks: [1],
  categoryIds: [],
};

test('artifactPresentation resolves a note document', () => {
  const artifact: Artifact = {
    ...base,
    id: 'note',
    kind: 'note',
    path: 'docs/weekly/note.md',
  };

  assert.deepEqual(artifactPresentation(artifact, content), {
    kind: 'note',
    document: content.notes[0],
  });
});

test('artifactPresentation resolves one code entry and supporting files', () => {
  const artifact: Artifact = {
    ...base,
    id: 'code',
    kind: 'code',
    root: 'learning/demo',
    files: [
      { path: 'learning/demo/main.py', role: 'entry' },
      { path: 'learning/demo/test_main.py', role: 'test' },
    ],
  };

  const presentation = artifactPresentation(artifact, content);
  assert.equal(presentation?.kind, 'code');
  if (presentation?.kind !== 'code') return;
  assert.equal(presentation.entry.document.path, 'learning/demo/main.py');
  assert.deepEqual(
    presentation.supporting.map(({ document, role }) => ({
      path: document.path,
      role,
    })),
    [{ path: 'learning/demo/test_main.py', role: 'test' }],
  );
});

test('artifactPresentation rejects missing artifacts and broken relationships', () => {
  assert.equal(artifactPresentation(undefined, content), undefined);

  const broken: Artifact = {
    ...base,
    id: 'broken',
    kind: 'note',
    path: 'docs/weekly/missing.md',
  };
  assert.equal(artifactPresentation(broken, content), undefined);
});
