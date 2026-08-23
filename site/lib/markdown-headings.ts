export interface MarkdownHeading {
  id: string;
  level: 2 | 3 | 4;
  text: string;
}

function headingText(source: string) {
  return source
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/<[^>]+>/g, '')
    .replace(/[~*_]/g, '')
    .trim();
}

function headingSlug(text: string) {
  const slug = text
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[^\p{Letter}\p{Number}\s-]/gu, '')
    .trim()
    .replace(/[\s-]+/g, '-');
  return slug || 'section';
}

export function extractMarkdownHeadings(source: string): MarkdownHeading[] {
  const headings: MarkdownHeading[] = [];
  const slugCounts = new Map<string, number>();
  let fence: { marker: '`' | '~'; length: number } | null = null;
  let previousLine: string | null = null;

  const addHeading = (level: 2 | 3 | 4, rawText: string) => {
    const text = headingText(rawText);
    if (!text) return;
    const baseSlug = headingSlug(text);
    const count = (slugCounts.get(baseSlug) ?? 0) + 1;
    slugCounts.set(baseSlug, count);
    headings.push({
      id: count === 1 ? baseSlug : `${baseSlug}-${count}`,
      level,
      text,
    });
  };

  for (const line of source.split(/\r?\n/)) {
    const fenceMatch = line.match(/^ {0,3}(`{3,}|~{3,})/);
    if (fenceMatch) {
      const marker = fenceMatch[1][0] as '`' | '~';
      const length = fenceMatch[1].length;
      if (fence === null) {
        fence = { marker, length };
      } else if (fence.marker === marker && length >= fence.length) {
        fence = null;
      }
      previousLine = null;
      continue;
    }
    if (fence !== null) {
      previousLine = null;
      continue;
    }

    if (/^ {0,3}-{3,}[ \t]*$/.test(line) && previousLine?.trim()) {
      addHeading(2, previousLine.trim());
      previousLine = null;
      continue;
    }

    const match = line.match(/^ {0,3}(#{2,4})[ \t]+(.+?)[ \t]*#*[ \t]*$/);
    if (match) {
      addHeading(match[1].length as 2 | 3 | 4, match[2]);
      previousLine = null;
      continue;
    }

    previousLine = line;
  }

  return headings;
}
