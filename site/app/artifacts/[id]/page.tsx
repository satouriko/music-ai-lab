import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { ArtifactContext } from '@/components/artifact-context';
import { CodeArtifact } from '@/components/code-artifact';
import { MarkdownDocument } from '@/components/markdown-content';
import { NotebookViewer } from '@/components/notebook-viewer';
import { artifactPresentation } from '@/lib/artifact-presentation';
import type { CodeArtifact as CodeArtifactData } from '@/lib/artifact-types';
import { artifactHref, findArtifact } from '@/lib/artifacts';
import { content } from '@/lib/content';
import { detailMetadata } from '@/lib/detail-metadata';

interface ArtifactPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ file?: string | string[] }>;
}

export function generateStaticParams() {
  return content.artifacts.map((artifact) => ({ id: artifact.id }));
}

export async function generateMetadata({
  params,
}: ArtifactPageProps): Promise<Metadata> {
  const { id } = await params;
  const artifact = findArtifact(id);
  if (!artifact) return {};

  return detailMetadata({
    title: artifact.title,
    description: artifact.summary,
    canonical: artifactHref(artifact.id),
  });
}

export default async function ArtifactPage({
  params,
  searchParams,
}: ArtifactPageProps) {
  const { id } = await params;
  const { file } = await searchParams;
  const artifact = findArtifact(id);
  const presentation = artifactPresentation(artifact, content);
  if (!artifact || !presentation) notFound();

  return (
    <main className={`artifact-page artifact-page-${artifact.kind}`} id="top">
      <ArtifactContext
        artifact={artifact}
        artifactIsCurrent
        showArtifactLink
      />
      <header className="artifact-heading">
        <p className="section-kicker">
          {artifact.kind === 'code' ? 'CODE EXERCISE' : artifact.kind.toUpperCase()}
        </p>
        <h1>{artifact.title}</h1>
        <p>{artifact.summary}</p>
      </header>

      {presentation.kind === 'note' && (
        <MarkdownDocument
          source={presentation.document.source}
          sourcePath={presentation.document.path}
        />
      )}
      {presentation.kind === 'code' && artifact.kind === 'code' && (
        <CodeArtifact
          artifact={artifact as CodeArtifactData}
          presentation={presentation}
          selectedPath={typeof file === 'string' ? file : undefined}
        />
      )}
      {presentation.kind === 'notebook' && (
        <NotebookViewer notebook={presentation.document} />
      )}
    </main>
  );
}
