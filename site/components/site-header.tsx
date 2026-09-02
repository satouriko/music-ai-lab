import { withSiteBasePath } from '@/lib/site-path';

export function SiteHeader() {
  return (
    <header className="site-header">
      <a className="brand" href={withSiteBasePath('/')} aria-label="Music AI Lab 首页">
        <span className="brand-mark" aria-hidden="true">
          <i />
          <i />
          <i />
        </span>
        <span>MUSIC AI LAB</span>
      </a>
      <span className="header-context">52 WEEK CURRICULUM</span>
    </header>
  );
}
