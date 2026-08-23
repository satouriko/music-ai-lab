import Link from 'next/link';
import {
  Children,
  isValidElement,
  type ComponentProps,
  type ReactElement,
  type ReactNode,
} from 'react';
import { MarkdownAsync } from 'react-markdown';
import rehypeKatex from 'rehype-katex';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';

import { TableOfContents } from '@/components/table-of-contents';
import { knownContentPaths } from '@/lib/content';
import { resolveRepositoryLink } from '@/lib/content-links';
import {
  highlightCode,
  normalizeHighlightLanguage,
} from '@/lib/highlight-code';
import {
  extractMarkdownHeadings,
  type MarkdownHeading,
} from '@/lib/markdown-headings';

export function normalizeMarkdownMathDelimiters(source: string) {
  let fence: { marker: '`' | '~'; length: number } | null = null;

  return source
    .split('\n')
    .map((line) => {
      const fenceMatch = line.match(/^\s*([`~]{3,})/);
      if (fenceMatch) {
        const marker = fenceMatch[1][0] as '`' | '~';
        if (fence === null) {
          fence = { marker, length: fenceMatch[1].length };
        } else if (marker === fence.marker && fenceMatch[1].length >= fence.length) {
          fence = null;
        }
        return line;
      }

      if (fence === null && /^\s*\\[\[\]]\s*$/.test(line)) {
        return `${line.match(/^\s*/)?.[0] ?? ''}$$`;
      }
      return line;
    })
    .join('\n');
}

async function MarkdownPre({ children }: { children?: ReactNode }) {
  const child = Children.count(children) === 1 ? Children.only(children) : null;
  if (!isValidElement(child)) return <pre>{children}</pre>;

  const code = child as ReactElement<{
    children?: ReactNode;
    className?: string;
  }>;
  const language = code.props.className?.match(/language-([\w-]+)/)?.[1];
  const source = String(code.props.children ?? '').replace(/\n$/, '');
  const html = await highlightCode(
    source,
    normalizeHighlightLanguage(language),
  );

  return (
    <div
      className="markdown-code-block"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

function headingComponent(
  level: 2 | 3 | 4,
  nextHeading: () => MarkdownHeading | undefined,
) {
  const Tag: 'h2' | 'h3' | 'h4' = `h${level}`;
  return function Heading({ children }: ComponentProps<typeof Tag>) {
    const heading = nextHeading();
    return (
      <Tag id={heading?.id} data-note-heading={heading?.id}>
        {children}
      </Tag>
    );
  };
}

export async function MarkdownContent({
  source,
  sourcePath,
  headings = extractMarkdownHeadings(source),
}: {
  headings?: MarkdownHeading[];
  source: string;
  sourcePath: string;
}) {
  let headingIndex = 0;
  const nextHeading = () => headings[headingIndex++];
  const normalizedSource = normalizeMarkdownMathDelimiters(source);

  return (
    <div className="prose-content">
      <MarkdownAsync
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={{
          a({ children, href }) {
            const resolved = resolveRepositoryLink(
              sourcePath,
              href ?? '',
              knownContentPaths,
            );

            if (resolved === null) {
              return (
                <code className="unresolved-link" title="无法映射的仓库路径">
                  {href || children}
                </code>
              );
            }
            if (resolved.startsWith('/')) {
              return <Link href={resolved}>{children}</Link>;
            }
            if (/^https?:/i.test(resolved)) {
              return (
                <a href={resolved} rel="noreferrer" target="_blank">
                  {children}
                </a>
              );
            }
            return <a href={resolved}>{children}</a>;
          },
          code({ children, className, ...props }) {
            return (
              <code className={className} {...props}>
                {children}
              </code>
            );
          },
          h2: headingComponent(2, nextHeading),
          h3: headingComponent(3, nextHeading),
          h4: headingComponent(4, nextHeading),
          pre: MarkdownPre,
        }}
      >
        {normalizedSource}
      </MarkdownAsync>
    </div>
  );
}

export function MarkdownDocument({
  source,
  sourcePath,
}: {
  source: string;
  sourcePath: string;
}) {
  const headings = extractMarkdownHeadings(source);

  return (
    <div className="note-reading-layout">
      <TableOfContents headings={headings} />
      <div className="note-reading-main">
        <MarkdownContent
          headings={headings}
          source={source}
          sourcePath={sourcePath}
        />
      </div>
    </div>
  );
}
