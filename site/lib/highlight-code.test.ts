import assert from 'node:assert/strict';
import test from 'node:test';

import { highlightCode, normalizeHighlightLanguage } from './highlight-code';

test('highlightCode escapes source markup before producing Shiki HTML', async () => {
  const html = await highlightCode(
    'print("<script>alert(1)</script>")',
    'python',
  );

  assert.equal(html.includes('<script>alert(1)</script>'), false);
  assert.equal(html.includes('script>alert(1)'), true);
});

test('normalizeHighlightLanguage supports note languages and safe fallback', () => {
  assert.equal(normalizeHighlightLanguage('py'), 'python');
  assert.equal(normalizeHighlightLanguage('sh'), 'bash');
  assert.equal(normalizeHighlightLanguage('shell'), 'bash');
  assert.equal(normalizeHighlightLanguage('yml'), 'yaml');
  assert.equal(normalizeHighlightLanguage('json'), 'json');
  assert.equal(normalizeHighlightLanguage('unknown'), 'text');
  assert.equal(normalizeHighlightLanguage(undefined), 'text');
});

test('highlightCode highlights shell source without loading the full bundle', async () => {
  const html = await highlightCode('echo "$PATH"', 'bash');

  assert.equal(html.includes('class="shiki'), true);
  assert.equal(html.includes('<span style="color:'), true);
});
