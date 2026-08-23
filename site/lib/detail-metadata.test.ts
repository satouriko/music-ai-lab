import assert from 'node:assert/strict';
import test from 'node:test';

import { detailMetadata } from './detail-metadata';

test('detail metadata keeps the shared social image and canonical route', () => {
  const metadata = detailMetadata({
    title: '训练环境检查',
    description: '确认本地训练环境可用。',
    canonical: '/artifacts/environment-check',
  });

  assert.equal(metadata.alternates?.canonical, '/artifacts/environment-check');
  assert.deepEqual(metadata.openGraph?.images, [
    {
      url: '/music-ai-roadmap-og.png',
      width: 1200,
      height: 630,
      alt: '音乐 AI 52 周学习路线',
    },
  ]);
  assert.deepEqual(metadata.twitter?.images, ['/music-ai-roadmap-og.png']);
});
