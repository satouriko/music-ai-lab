import assert from 'node:assert/strict';
import test from 'node:test';

import type { Artifact } from './artifact-types';
import { groupArtifactsForWeek } from './roadmap-artifacts';

const base = {
  title: 'Artifact',
  summary: 'Summary',
  categoryIds: [],
};

const artifacts: Artifact[] = [
  {
    ...base,
    id: 'weekly-note',
    kind: 'note',
    weeks: [1],
    path: 'docs/weekly/note.md',
  },
  {
    ...base,
    id: 'environment-check',
    kind: 'code',
    weeks: [1],
    root: 'learning/environment',
    files: [{ path: 'learning/environment/main.py', role: 'entry' }],
  },
  {
    ...base,
    id: 'experiment',
    kind: 'notebook',
    weeks: [2],
    path: 'notebooks/experiment.ipynb',
  },
];

test('groupArtifactsForWeek groups only the current week by content kind', () => {
  const groups = groupArtifactsForWeek(artifacts, 1);

  assert.deepEqual(groups.notes.map((artifact) => artifact.id), ['weekly-note']);
  assert.deepEqual(groups.code.map((artifact) => artifact.id), [
    'environment-check',
  ]);
  assert.deepEqual(groups.notebooks, []);
});

test('groupArtifactsForWeek returns empty groups without placeholders', () => {
  assert.deepEqual(groupArtifactsForWeek(artifacts, 52), {
    notes: [],
    code: [],
    notebooks: [],
  });
});
