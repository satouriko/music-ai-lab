import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { ArtifactContext } from '@/components/artifact-context';
import { NotebookViewer } from '@/components/notebook-viewer';
import { artifactForContentPath, artifactHref } from '@/lib/artifacts';
import { content, findNotebook } from '@/lib/content';
import { detailMetadata } from '@/lib/detail-metadata';

interface NotebookPageProps {
  params: Promise<{ path: string[] }>;
}

export function generateStaticParams() {
  return content.notebooks.map((notebook) => ({
    path: notebook.path.split('/'),
  }));
}

export async function generateMetadata({
  params,
}: NotebookPageProps): Promise<Metadata> {
  const { path } = await params;
  const notebook = findNotebook(path.join('/'));
  const artifact = notebook
    ? artifactForContentPath(notebook.path)
    : undefined;
  if (!notebook || !artifact) return {};

  const description = `阅读 Music AI Lab Notebook：${notebook.title}`;
  return detailMetadata({
    title: notebook.title,
    description,
    canonical: artifactHref(artifact.id),
  });
}

export default async function NotebookDetailPage({
  params,
}: NotebookPageProps) {
  const { path } = await params;
  const notebook = findNotebook(path.join('/'));
  const artifact = notebook
    ? artifactForContentPath(notebook.path)
    : undefined;
  if (!notebook || !artifact) notFound();

  return (
    <main className="document-page notebook-document-page">
      <ArtifactContext artifact={artifact} showArtifactLink />
      <header className="document-heading">
        <p className="section-kicker">NOTEBOOK</p>
        <h1>{notebook.title}</h1>
        <code>{notebook.path}</code>
      </header>
      <NotebookViewer notebook={notebook} />
    </main>
  );
}
