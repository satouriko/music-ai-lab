import { withSiteBasePath } from '@/lib/site-path';

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <strong>MUSIC AI LAB</strong>
      <p>路线是入口，笔记、代码和实验是学习留下的证据。</p>
      <a href={withSiteBasePath('/#roadmap')}>回到路线 ↑</a>
    </footer>
  );
}
