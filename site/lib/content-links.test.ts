import assert from 'node:assert/strict';
import test from 'node:test';

import type { ContentKind } from './content-types';
import { contentHref, resolveRepositoryLink } from './content-links';

const knownPaths = new Map<string, ContentKind>([
  ['docs/weekly/2026-W34.md', 'note'],
  ['learning/00-environment/environment_check.py', 'code'],
  ['notebooks/2026-08-23-demo.ipynb', 'notebook'],
]);

test('contentHref preserves and encodes every repository path segment', () => {
  assert.equal(
    contentHref('code', 'learning/a b/train.py'),
    '/code/learning/a%20b/train.py/',
  );
  assert.equal(
    contentHref('code', 'learning/a b/train.py', '/music-ai-lab'),
    '/music-ai-lab/code/learning/a%20b/train.py/',
  );
});

test('resolveRepositoryLink maps known repository-relative content', () => {
  assert.equal(
    resolveRepositoryLink(
      'docs/weekly/2026-W34.md',
      '../../learning/00-environment/environment_check.py#main',
      knownPaths,
    ),
    '/code/learning/00-environment/environment_check.py/#main',
  );
});

test('resolveRepositoryLink rejects traversal and unknown files', () => {
  assert.equal(
    resolveRepositoryLink(
      'docs/weekly/2026-W34.md',
      '../../../../etc/passwd',
      knownPaths,
    ),
    null,
  );
  assert.equal(
    resolveRepositoryLink(
      'docs/weekly/2026-W34.md',
      './missing.md',
      knownPaths,
    ),
    null,
  );
});

test('resolveRepositoryLink preserves supported external and fragment links', () => {
  assert.equal(
    resolveRepositoryLink(
      'docs/weekly/2026-W34.md',
      'https://pytorch.org/',
      knownPaths,
    ),
    'https://pytorch.org/',
  );
  assert.equal(
    resolveRepositoryLink(
      'docs/weekly/2026-W34.md',
      '#environment',
      knownPaths,
    ),
    '#environment',
  );
});
