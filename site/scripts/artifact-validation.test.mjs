import assert from 'node:assert/strict';
import test from 'node:test';

import { validateArtifacts } from './artifact-validation.mjs';

const content = {
  roadmap: {
    weeks: [{ week: 1 }, { week: 2 }],
    categories: [{ id: 'math-ml' }],
  },
  notes: [{ path: 'docs/weekly/2026-W34.md' }],
  code: [
    { path: 'learning/exercise/main.py' },
    { path: 'learning/exercise/test_main.py' },
  ],
  notebooks: [{ path: 'notebooks/demo.ipynb' }],
};

const artifacts = [
  {
    id: 'weekly-note',
    kind: 'note',
    title: 'Weekly note',
    summary: 'What changed this week.',
    weeks: [1, 2],
    categoryIds: ['math-ml'],
    path: 'docs/weekly/2026-W34.md',
  },
  {
    id: 'exercise',
    kind: 'code',
    title: 'Exercise',
    summary: 'A complete code exercise.',
    weeks: [1],
    categoryIds: ['math-ml'],
    root: 'learning/exercise',
    files: [
      { path: 'learning/exercise/main.py', role: 'entry' },
      { path: 'learning/exercise/test_main.py', role: 'test' },
    ],
  },
  {
    id: 'demo-notebook',
    kind: 'notebook',
    title: 'Demo notebook',
    summary: 'A saved experiment.',
    weeks: [2],
    categoryIds: [],
    path: 'notebooks/demo.ipynb',
  },
];

test('validateArtifacts accepts complete roadmap relationships', () => {
  assert.doesNotThrow(() => validateArtifacts(artifacts, content));
});

test('validateArtifacts rejects unknown roadmap references', () => {
  const unknownWeek = structuredClone(artifacts);
  unknownWeek[1].weeks = [53];
  assert.throws(
    () => validateArtifacts(unknownWeek, content),
    /artifact exercise references unknown week 53/,
  );

  const unknownCategory = structuredClone(artifacts);
  unknownCategory[1].categoryIds = ['missing'];
  assert.throws(
    () => validateArtifacts(unknownCategory, content),
    /artifact exercise references unknown category missing/,
  );
});

test('validateArtifacts rejects invalid and duplicate artifact shapes', () => {
  const duplicateId = [...structuredClone(artifacts), structuredClone(artifacts[0])];
  assert.throws(
    () => validateArtifacts(duplicateId, content),
    /duplicate artifact id weekly-note/,
  );

  const missingEntry = structuredClone(artifacts);
  missingEntry[1].files[0].role = 'support';
  assert.throws(
    () => validateArtifacts(missingEntry, content),
    /artifact exercise must contain exactly one entry file/,
  );

  const invalidKind = structuredClone(artifacts);
  invalidKind[0].kind = 'video';
  assert.throws(
    () => validateArtifacts(invalidKind, content),
    /artifact weekly-note has invalid kind video/,
  );
});

test('validateArtifacts rejects unknown, duplicate, and orphan content paths', () => {
  const unknownPath = structuredClone(artifacts);
  unknownPath[1].files[0].path = 'secret.py';
  assert.throws(
    () => validateArtifacts(unknownPath, content),
    /artifact exercise references unknown content path secret\.py/,
  );

  const duplicatePath = structuredClone(artifacts);
  duplicatePath.push({
    ...structuredClone(artifacts[0]),
    id: 'duplicate-note',
  });
  assert.throws(
    () => validateArtifacts(duplicatePath, content),
    /content path docs\/weekly\/2026-W34\.md belongs to multiple artifacts/,
  );

  assert.throws(
    () => validateArtifacts([], content),
    /orphan content docs\/weekly\/2026-W34\.md/,
  );
});
