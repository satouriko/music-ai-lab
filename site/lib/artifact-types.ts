export interface ArtifactBase {
  id: string;
  title: string;
  summary: string;
  weeks: number[];
  categoryIds: string[];
}

export interface NoteArtifact extends ArtifactBase {
  kind: 'note';
  path: string;
}

export type CodeFileRole = 'entry' | 'test' | 'support';

export interface CodeArtifactFile {
  path: string;
  role: CodeFileRole;
}

export interface CodeArtifact extends ArtifactBase {
  kind: 'code';
  root: string;
  files: CodeArtifactFile[];
}

export interface NotebookArtifact extends ArtifactBase {
  kind: 'notebook';
  path: string;
}

export type Artifact = NoteArtifact | CodeArtifact | NotebookArtifact;
