import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { ArtifactContext } from '@/components/artifact-context';
import { MarkdownDocument } from '@/components/markdown-content';
import { artifactForContentPath, artifactHref } from '@/lib/artifacts';
import { content, findNote } from '@/lib/content';
import { detailMetadata } from '@/lib/detail-metadata';

interface NotePageProps {
  params: Promise<{ path: string[] }>;
}

export function generateStaticParams() {
  return content.notes.map((note) => ({ path: note.path.split('/') }));
}

export async function generateMetadata({
  params,
}: NotePageProps): Promise<Metadata> {
  const { path } = await params;
  const note = findNote(path.join('/'));
  const artifact = note ? artifactForContentPath(note.path) : undefined;
  if (!note || !artifact) return {};

  const description = `阅读 Music AI Lab 笔记：${note.title}`;
  return detailMetadata({
    title: note.title,
    description,
    canonical: artifactHref(artifact.id),
  });
}

export default async function NotePage({ params }: NotePageProps) {
  const { path } = await params;
  const note = findNote(path.join('/'));
  const artifact = note ? artifactForContentPath(note.path) : undefined;
  if (!note || !artifact) notFound();

  return (
    <main className="document-page" id="top">
      <ArtifactContext artifact={artifact} showArtifactLink />
      <header className="document-heading">
        <p className="section-kicker">NOTE</p>
        <h1>{note.title}</h1>
        <code>{note.path}</code>
      </header>
      <MarkdownDocument source={note.source} sourcePath={note.path} />
    </main>
  );
}
