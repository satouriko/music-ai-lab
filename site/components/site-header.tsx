import Link from 'next/link';

export function SiteHeader() {
  return (
    <header className="site-header">
      <Link className="brand" href="/" aria-label="Music AI Lab 首页">
        <span className="brand-mark" aria-hidden="true">
          <i />
          <i />
          <i />
        </span>
        <span>MUSIC AI LAB</span>
      </Link>
      <span className="header-context">52 WEEK CURRICULUM</span>
    </header>
  );
}
