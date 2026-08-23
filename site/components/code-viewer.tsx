import {
  highlightCode,
  type HighlightLanguage,
} from '@/lib/highlight-code';

export async function CodeViewer({
  language = 'python',
  source,
}: {
  language?: HighlightLanguage;
  source: string;
}) {
  const html = await highlightCode(source, language);

  return (
    <div
      className="code-viewer"
      // Shiki escapes source text before producing its controlled span markup.
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
