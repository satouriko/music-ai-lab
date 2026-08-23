import type {
  Artifact,
  CodeArtifactFile,
} from './artifact-types';
import type {
  CodeDocument,
  GeneratedContent,
  NoteDocument,
  NotebookDocument,
} from './content-types';

type ArtifactContent = Pick<
  GeneratedContent,
  'notes' | 'code' | 'notebooks'
>;

export type ArtifactPresentation =
  | { kind: 'note'; document: NoteDocument }
  | {
      kind: 'code';
      entry: { document: CodeDocument; role: 'entry' };
      supporting: Array<{
        document: CodeDocument;
        role: Exclude<CodeArtifactFile['role'], 'entry'>;
      }>;
    }
  | { kind: 'notebook'; document: NotebookDocument };

export function artifactPresentation(
  artifact: Artifact | undefined,
  content: ArtifactContent,
): ArtifactPresentation | undefined {
  if (!artifact) return undefined;

  if (artifact.kind === 'note') {
    const document = content.notes.find((note) => note.path === artifact.path);
    return document ? { kind: 'note', document } : undefined;
  }

  if (artifact.kind === 'notebook') {
    const document = content.notebooks.find(
      (notebook) => notebook.path === artifact.path,
    );
    return document ? { kind: 'notebook', document } : undefined;
  }

  const resolved = artifact.files.map((file) => ({
    document: content.code.find((document) => document.path === file.path),
    role: file.role,
  }));
  if (resolved.some(({ document }) => !document)) return undefined;

  const entry = resolved.find(({ role }) => role === 'entry');
  if (!entry?.document) return undefined;

  return {
    kind: 'code',
    entry: { document: entry.document, role: 'entry' },
    supporting: resolved
      .filter(
        (file): file is {
          document: CodeDocument;
          role: 'support' | 'test';
        } => Boolean(file.document) && file.role !== 'entry',
      ),
  };
}
