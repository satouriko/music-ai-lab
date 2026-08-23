import assert from 'node:assert/strict';
import test from 'node:test';

import { extractMarkdownHeadings } from './markdown-headings';

test('extractMarkdownHeadings creates stable ids for level two through four headings', () => {
  const source = [
    '# Document title',
    '## 安装',
    '### 安装',
    '## `PyTorch` 与 [TensorFlow](https://example.com)',
    '#### Optimizer step',
  ].join('\n');

  assert.deepEqual(extractMarkdownHeadings(source), [
    { id: '安装', level: 2, text: '安装' },
    { id: '安装-2', level: 3, text: '安装' },
    {
      id: 'pytorch-与-tensorflow',
      level: 2,
      text: 'PyTorch 与 TensorFlow',
    },
    { id: 'optimizer-step', level: 4, text: 'Optimizer step' },
  ]);
});

test('extractMarkdownHeadings ignores heading syntax inside fenced code', () => {
  const source = [
    '## Visible',
    '```markdown',
    '## Hidden',
    '```',
    '~~~text',
    '### Also hidden',
    '~~~',
  ].join('\n');

  assert.deepEqual(extractMarkdownHeadings(source), [
    { id: 'visible', level: 2, text: 'Visible' },
  ]);
});

test('extractMarkdownHeadings keeps Setext level-two headings in TOC order', () => {
  const source = [
    'Setext heading',
    '---',
    '### Child',
  ].join('\n');

  assert.deepEqual(extractMarkdownHeadings(source), [
    { id: 'setext-heading', level: 2, text: 'Setext heading' },
    { id: 'child', level: 3, text: 'Child' },
  ]);
});
