'use client';

import { useEffect, useRef, useState } from 'react';

import type { MarkdownHeading } from '@/lib/markdown-headings';
import { centeredTocScrollTop, tocHashMatchesId } from '@/lib/toc-scroll';

function followActiveEntry(nav: HTMLElement | null, activeId: string) {
  if (!nav || nav.clientHeight === 0) return;
  const activeLink = Array.from(nav.querySelectorAll<HTMLAnchorElement>('a'))
    .find((link) => tocHashMatchesId(link.hash, activeId));
  if (!activeLink) return;

  const navRect = nav.getBoundingClientRect();
  const linkRect = activeLink.getBoundingClientRect();
  const label = nav.querySelector<HTMLElement>(':scope > p');
  nav.scrollTop = centeredTocScrollTop({
    clientHeight: nav.clientHeight,
    headerHeight: label?.offsetHeight ?? 0,
    itemHeight: linkRect.height,
    itemTop: nav.scrollTop + linkRect.top - navRect.top,
    scrollHeight: nav.scrollHeight,
  });
}

function TocLinks({
  activeId,
  headings,
}: {
  activeId: string | undefined;
  headings: MarkdownHeading[];
}) {
  return (
    <ol>
      {headings.map((heading) => (
        <li className={`toc-level-${heading.level}`} key={heading.id}>
          <a
            aria-current={activeId === heading.id ? 'location' : undefined}
            href={`#${heading.id}`}
          >
            {heading.text}
          </a>
        </li>
      ))}
    </ol>
  );
}

export function TableOfContents({ headings }: { headings: MarkdownHeading[] }) {
  const [activeId, setActiveId] = useState(headings[0]?.id);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const desktopTocRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const elements = headings
      .map(({ id }) => document.getElementById(id))
      .filter((element): element is HTMLElement => Boolean(element));
    if (elements.length === 0) return undefined;

    let frame = 0;
    const update = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        const threshold = 116;
        let current = elements[0].id;
        for (const element of elements) {
          if (element.getBoundingClientRect().top > threshold) break;
          current = element.id;
        }
        if (
          window.innerHeight + window.scrollY
          >= document.documentElement.scrollHeight - 4
        ) {
          current = elements[elements.length - 1].id;
        }
        followActiveEntry(desktopTocRef.current, current);
        setActiveId(current);
        setShowBackToTop(window.scrollY > 640);
      });
    };

    update();
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, [headings]);

  if (headings.length === 0) return null;

  return (
    <>
      <nav
        className="note-toc note-toc-desktop"
        aria-label="本文目录"
        ref={desktopTocRef}
      >
        <p>本文目录</p>
        <TocLinks activeId={activeId} headings={headings} />
      </nav>
      <details className="note-toc note-toc-mobile">
        <summary>本文目录</summary>
        <nav aria-label="本文目录">
          <TocLinks activeId={activeId} headings={headings} />
        </nav>
      </details>
      <a
        aria-hidden={!showBackToTop}
        className={`back-to-top${showBackToTop ? ' visible' : ''}`}
        href="#top"
        tabIndex={showBackToTop ? 0 : -1}
      >
        返回顶部 ↑
      </a>
    </>
  );
}
