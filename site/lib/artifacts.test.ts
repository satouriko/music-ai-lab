import assert from 'node:assert/strict';
import test from 'node:test';

import type { Artifact } from './artifact-types';
import {
  artifactFileHref,
  artifactForContentPathFrom,
  artifactHref,
  artifactsForWeekFrom,
  roadmapWeekHref,
} from './artifacts';

const artifacts: Artifact[] = [
  {
    id: 'environment-check',
    kind: 'code',
    title: 'Environment',
    summary: 'Environment evidence.',
    weeks: [1],
    categoryIds: ['math-ml'],
    root: 'learning/environment',
    files: [
      { path: 'learning/environment/main.py', role: 'entry' },
      { path: 'learning/environment/test_main.py', role: 'test' },
    ],
  },
  {
    id: 'weekly-note',
    kind: 'note',
    title: 'Weekly note',
    summary: 'Weekly evidence.',
    weeks: [1, 2],
    categoryIds: [],
    path: 'docs/weekly/note.md',
  },
];

test('artifactsForWeekFrom returns only artifacts attached to a week', () => {
  assert.deepEqual(
    artifactsForWeekFrom(artifacts, 1).map((artifact) => artifact.id),
    ['environment-check', 'weekly-note'],
  );
  assert.deepEqual(
    artifactsForWeekFrom(artifacts, 2).map((artifact) => artifact.id),
    ['weekly-note'],
  );
  assert.deepEqual(artifactsForWeekFrom(artifacts, 3), []);
});

test('artifactForContentPathFrom finds exact note and code ownership', () => {
  assert.equal(
    artifactForContentPathFrom(artifacts, 'learning/environment/main.py')?.id,
    'environment-check',
  );
  assert.equal(
    artifactForContentPathFrom(artifacts, 'docs/weekly/note.md')?.id,
    'weekly-note',
  );
  assert.equal(
    artifactForContentPathFrom(artifacts, 'learning/environment')?.id,
    undefined,
  );
  assert.equal(
    artifactForContentPathFrom(artifacts, '../docs/weekly/note.md'),
    undefined,
  );
});

test('artifact and roadmap links use stable encoded routes', () => {
  assert.equal(artifactHref('weekly note'), '/artifacts/weekly%20note/');
  assert.equal(
    artifactFileHref('learning/environment/test_main.py'),
    '/code/learning/environment/test_main.py/',
  );
  assert.equal(roadmapWeekHref(4), '/#week-4');
});

test('artifact and roadmap links include the GitHub Pages base path', () => {
  assert.equal(
    artifactHref('weekly note', '/music-ai-lab'),
    '/music-ai-lab/artifacts/weekly%20note/',
  );
  assert.equal(
    artifactFileHref('learning/environment/test_main.py', '/music-ai-lab'),
    '/music-ai-lab/code/learning/environment/test_main.py/',
  );
  assert.equal(roadmapWeekHref(4, '/music-ai-lab'), '/music-ai-lab/#week-4');
});
