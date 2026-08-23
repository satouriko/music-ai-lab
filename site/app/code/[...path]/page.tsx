import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { ArtifactContext } from '@/components/artifact-context';
import { CodeArtifact } from '@/components/code-artifact';
import { artifactPresentation } from '@/lib/artifact-presentation';
import { artifactFileHref, artifactForContentPath } from '@/lib/artifacts';
import { content, findCode } from '@/lib/content';
import { detailMetadata } from '@/lib/detail-metadata';

interface CodePageProps {
  params: Promise<{ path: string[] }>;
}

export function generateStaticParams() {
  return content.code.map((document) => ({
    path: document.path.split('/'),
  }));
}

export async function generateMetadata({
  params,
}: CodePageProps): Promise<Metadata> {
  const { path } = await params;
  const document = findCode(path.join('/'));
  const artifact = document
    ? artifactForContentPath(document.path)
    : undefined;
  if (!document || !artifact) return {};

  const description = `查看 Music AI Lab 源码：${document.path}`;
  return detailMetadata({
    title: document.title,
    description,
    canonical: artifactFileHref(document.path),
  });
}

export default async function CodeDetailPage({ params }: CodePageProps) {
  const { path } = await params;
  const document = findCode(path.join('/'));
  const artifact = document
    ? artifactForContentPath(document.path)
    : undefined;
  const presentation = artifactPresentation(artifact, content);
  if (
    !document
    || !artifact
    || artifact.kind !== 'code'
    || presentation?.kind !== 'code'
  ) notFound();

  return (
    <main className="artifact-page artifact-page-code" id="top">
      <ArtifactContext artifact={artifact} showArtifactLink />
      <header className="artifact-heading">
        <p className="section-kicker">CODE FILE</p>
        <h1>{artifact.title}</h1>
        <p>{artifact.summary}</p>
      </header>
      <CodeArtifact
        artifact={artifact}
        presentation={presentation}
        selectedPath={document.path}
      />
    </main>
  );
}
