import { CodeViewer } from '@/components/code-viewer';
import type { CodeArtifact as CodeArtifactData } from '@/lib/artifact-types';
import type { ArtifactPresentation } from '@/lib/artifact-presentation';
import { artifactFileHref } from '@/lib/artifacts';

const roleLabels = {
  entry: '入口',
  support: '辅助',
  test: '测试',
};

export function CodeArtifact({
  artifact,
  presentation,
  selectedPath,
}: {
  artifact: CodeArtifactData;
  presentation: Extract<ArtifactPresentation, { kind: 'code' }>;
  selectedPath?: string;
}) {
  const files = [presentation.entry, ...presentation.supporting];
  const selected = files.find(
    ({ document }) => document.path === selectedPath,
  ) ?? presentation.entry;

  return (
    <div className="code-artifact-layout">
      <aside className="artifact-file-index" aria-label="练习文件">
        <p>{artifact.root}</p>
        <ol>
          {files.map(({ document, role }) => (
            <li key={document.path}>
              <span>{roleLabels[role]}</span>
              {document.path === selected.document.path ? (
                <strong>{document.title}</strong>
              ) : (
                <a
                  href={artifactFileHref(document.path)}
                >
                  {document.title}
                </a>
              )}
            </li>
          ))}
        </ol>
      </aside>
      <section className="artifact-entry-code">
        <header>
          <span>{roleLabels[selected.role]}</span>
          <code>{selected.document.path}</code>
        </header>
        <CodeViewer
          language={selected.document.language}
          source={selected.document.source}
        />
      </section>
    </div>
  );
}
