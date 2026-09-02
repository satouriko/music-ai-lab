'use client';

import { useEffect } from 'react';

import { withSiteBasePath } from '@/lib/site-path';

export function RoadmapRedirect() {
  const roadmapHref = withSiteBasePath('/#roadmap');

  useEffect(() => {
    window.location.replace(roadmapHref);
  }, [roadmapHref]);

  return (
    <main className="document-page redirect-page">
      <header className="document-heading">
        <p className="section-kicker">MUSIC AI LAB</p>
        <h1>正在返回学习路线</h1>
        <p>
          内容现在从 Roadmap 进入。若页面没有自动跳转，
          <a href={roadmapHref}>回到学习路线</a>。
        </p>
      </header>
    </main>
  );
}
