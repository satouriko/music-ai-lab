import generatedContent from '../.generated/content.json';

import type {
  ContentKind,
  GeneratedContent,
} from './content-types';

export const content = generatedContent as unknown as GeneratedContent;
export const artifacts = content.artifacts;

export const knownContentPaths = new Map<string, ContentKind>([
  ...content.notes.map((document) => [document.path, 'note'] as const),
  ...content.code.map((document) => [document.path, 'code'] as const),
  ...content.notebooks.map(
    (document) => [document.path, 'notebook'] as const,
  ),
]);

export function findNote(path: string) {
  return content.notes.find((document) => document.path === path);
}

export function findCode(path: string) {
  return content.code.find((document) => document.path === path);
}

export function findNotebook(path: string) {
  return content.notebooks.find((document) => document.path === path);
}
