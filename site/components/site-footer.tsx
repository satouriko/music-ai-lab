import Link from 'next/link';

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <strong>MUSIC AI LAB</strong>
      <p>路线是入口，笔记、代码和实验是学习留下的证据。</p>
      <Link href="/#roadmap">回到路线 ↑</Link>
    </footer>
  );
}
