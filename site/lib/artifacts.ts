import type { Artifact } from './artifact-types';
import { content } from './content';

function isStableRepositoryPath(path: string) {
  if (!path || path.startsWith('/') || path.includes('\\')) return false;
  return path.split('/').every((segment) => segment !== '' && segment !== '.' && segment !== '..');
}

export function artifactHref(id: string) {
  return `/artifacts/${encodeURIComponent(id)}`;
}

export function artifactFileHref(path: string) {
  const encodedPath = path
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/');
  return `/code/${encodedPath}`;
}

export function roadmapWeekHref(week: number) {
  return `/#week-${week}`;
}

export function artifactsForWeekFrom(
  artifacts: readonly Artifact[],
  week: number,
) {
  return artifacts.filter((artifact) => artifact.weeks.includes(week));
}

export function findArtifactFrom(
  artifacts: readonly Artifact[],
  id: string,
) {
  return artifacts.find((artifact) => artifact.id === id);
}

export function artifactForContentPathFrom(
  artifacts: readonly Artifact[],
  path: string,
) {
  if (!isStableRepositoryPath(path)) return undefined;
  return artifacts.find((artifact) => {
    if (artifact.kind === 'code') {
      return artifact.files.some((file) => file.path === path);
    }
    return artifact.path === path;
  });
}

export function findArtifact(id: string) {
  return findArtifactFrom(content.artifacts, id);
}

export function artifactsForWeek(week: number) {
  return artifactsForWeekFrom(content.artifacts, week);
}

export function artifactForContentPath(path: string) {
  return artifactForContentPathFrom(content.artifacts, path);
}
