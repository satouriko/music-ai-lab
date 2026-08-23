import assert from 'node:assert/strict';
import test from 'node:test';

import { centeredTocScrollTop, tocHashMatchesId } from './toc-scroll';

test('matches an encoded table-of-contents hash to its Chinese heading id', () => {
  assert.equal(
    tocHashMatchesId(
      '#162-%E5%AE%9E%E6%B5%8B%E6%B5%81%E7%A8%8B',
      '162-实测流程',
    ),
    true,
  );
});

test('centers the active entry below the sticky table-of-contents label', () => {
  assert.equal(centeredTocScrollTop({
    clientHeight: 520,
    headerHeight: 42,
    itemHeight: 20,
    itemTop: 670,
    scrollHeight: 1600,
  }), 399);
});

test('clamps table-of-contents following at both scroll boundaries', () => {
  assert.equal(centeredTocScrollTop({
    clientHeight: 520,
    headerHeight: 42,
    itemHeight: 20,
    itemTop: 20,
    scrollHeight: 1600,
  }), 0);
  assert.equal(centeredTocScrollTop({
    clientHeight: 520,
    headerHeight: 42,
    itemHeight: 20,
    itemTop: 1580,
    scrollHeight: 1600,
  }), 1080);
});
