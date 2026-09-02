'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export function RoadmapRedirect() {
  const router = useRouter();
  const roadmapHref = '/#roadmap';

  useEffect(() => {
    router.replace(roadmapHref);
  }, [router]);

  return (
    <main className="document-page redirect-page">
      <header className="document-heading">
        <p className="section-kicker">MUSIC AI LAB</p>
        <h1>正在返回学习路线</h1>
        <p>
          内容现在从 Roadmap 进入。若页面没有自动跳转，
          <Link href={roadmapHref}>回到学习路线</Link>。
        </p>
      </header>
    </main>
  );
}
