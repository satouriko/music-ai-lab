import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import test from 'node:test';
import { renderToReadableStream } from 'react-dom/server';

import { MarkdownContent } from '@/components/markdown-content';

const require = createRequire(import.meta.url);

async function renderMarkdown(source: string) {
  const element = await MarkdownContent({
    source,
    sourcePath: 'docs/weekly/example.md',
  });
  const stream = await renderToReadableStream(element);
  return new Response(stream).text();
}

test('MarkdownContent renders math and level-four heading anchors', async () => {
  const source = [
    '## Formula',
    '',
    '$$',
    'y = wx + b',
    '$$',
    '',
    '#### Update step',
    '',
    '- first',
    '- second',
  ].join('\n');
  const html = await renderMarkdown(source);

  assert.match(html, /class="katex-display"/);
  assert.match(html, /<h4 id="update-step"/);
  assert.match(html, /<ul>\s*<li>first<\/li>/);
});

test('MarkdownContent renders ChatGPT-style bracket delimiters as block math', async () => {
  const html = await renderMarkdown([
    '\\[',
    String.raw`z_1=W_1x+b_1,\qquad h_1=\operatorname{ReLU}(z_1)`,
    '\\]',
    '',
    '```tex',
    '\\[not rendered\\]',
    '```',
  ].join('\n'));

  assert.match(html, /class="katex-display"/);
  assert.match(html, /application\/x-tex/);
  assert.doesNotMatch(html, />\[</);
  assert.match(html, /\\\[not rendered\\\]/);
});

test('MarkdownContent ships KaTeX sizing rules for the classes its renderer emits', async () => {
  const html = await renderMarkdown(String.raw`$$x_1=\frac{1}{2}$$`);
  const sizingClass = html.match(
    /class="((?:katex-sizing|sizing) reset-size6 size3[^\"]*)"/,
  )?.[1].split(' ')[0];

  assert.ok(sizingClass, 'expected KaTeX to emit a script-sizing class');

  const stylesheet = await readFile(
    require.resolve('katex/dist/katex.min.css'),
    'utf8',
  );
  assert.ok(
    stylesheet.includes(`.${sizingClass}.reset-size6.size3`),
    `KaTeX stylesheet does not style the emitted .${sizingClass} class`,
  );
});
