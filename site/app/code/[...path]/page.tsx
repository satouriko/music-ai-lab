import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { ArtifactContext } from '@/components/artifact-context';
import { CodeViewer } from '@/components/code-viewer';
import { artifactForContentPath, artifactHref } from '@/lib/artifacts';
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
    canonical: artifactHref(artifact.id),
  });
}

export default async function CodeDetailPage({ params }: CodePageProps) {
  const { path } = await params;
  const document = findCode(path.join('/'));
  const artifact = document
    ? artifactForContentPath(document.path)
    : undefined;
  if (!document || !artifact) notFound();

  return (
    <main className="document-page code-document-page">
      <ArtifactContext artifact={artifact} showArtifactLink />
      <header className="document-heading">
        <p className="section-kicker">PYTHON SOURCE</p>
        <h1>{document.title}</h1>
        <code>{document.path}</code>
      </header>
      <CodeViewer language={document.language} source={document.source} />
    </main>
  );
}
