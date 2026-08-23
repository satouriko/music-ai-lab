import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { validateRoadmap } from './roadmap-validation.mjs';

const roadmap = JSON.parse(
  await readFile(new URL('../../roadmap/roadmap.json', import.meta.url), 'utf8'),
);

test('validateRoadmap rejects an incomplete roadmap before site generation', () => {
  assert.throws(
    () => validateRoadmap({
      weeks: [],
      phases: [],
      categories: [],
      extensionPaths: [],
    }),
    /52 weeks/,
  );
});

test('validateRoadmap validates every nested field rendered by the roadmap', () => {
  const cases = [
    {
      mutate(data) { delete data.categories[0].resources; },
      expected: /category math-ml missing resources/,
    },
    {
      mutate(data) { data.categories[0].resources[0].url = 'javascript:alert(1)'; },
      expected: /category math-ml resource 1 has a non-HTTPS url/,
    },
    {
      mutate(data) { delete data.phases[0].weeks; },
      expected: /phase setup has invalid weeks/,
    },
    {
      mutate(data) { delete data.extensionPaths[0].focus; },
      expected: /extension research missing focus/,
    },
  ];

  for (const { mutate, expected } of cases) {
    const candidate = structuredClone(roadmap);
    mutate(candidate);
    assert.throws(() => validateRoadmap(candidate), expected);
  }
});
