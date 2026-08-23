import type {
  Artifact,
  CodeArtifact,
  NoteArtifact,
  NotebookArtifact,
} from './artifact-types';

export interface RoadmapArtifactGroups {
  notes: NoteArtifact[];
  code: CodeArtifact[];
  notebooks: NotebookArtifact[];
}

export function groupArtifactsForWeek(
  artifacts: readonly Artifact[],
  week: number,
): RoadmapArtifactGroups {
  const groups: RoadmapArtifactGroups = {
    notes: [],
    code: [],
    notebooks: [],
  };

  for (const artifact of artifacts) {
    if (!artifact.weeks.includes(week)) continue;
    if (artifact.kind === 'note') groups.notes.push(artifact);
    if (artifact.kind === 'code') groups.code.push(artifact);
    if (artifact.kind === 'notebook') groups.notebooks.push(artifact);
  }

  return groups;
}
