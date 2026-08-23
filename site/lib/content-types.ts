import type { RoadmapData } from './roadmap-types';
import type { Artifact } from './artifact-types';

export type ContentKind = 'note' | 'code' | 'notebook';

export interface NoteDocument {
  path: string;
  title: string;
  section: string;
  source: string;
}

export interface CodeDocument extends NoteDocument {
  language: 'python';
}

export type NotebookOutput =
  | { kind: 'text'; text: string }
  | { kind: 'error'; name: string; value: string; traceback: string }
  | {
      kind: 'image';
      mimeType: 'image/png' | 'image/jpeg';
      data: string;
    }
  | { kind: 'unsupported'; mimeTypes: string[] };

export interface NotebookCell {
  kind: 'markdown' | 'code' | 'raw';
  source: string;
  executionCount: number | null;
  outputs: NotebookOutput[];
}

export interface NotebookDocument {
  path: string;
  title: string;
  section: 'notebooks';
  cells: NotebookCell[];
}

export interface GeneratedContent {
  roadmap: RoadmapData;
  artifacts: Artifact[];
  notes: NoteDocument[];
  code: CodeDocument[];
  notebooks: NotebookDocument[];
}
