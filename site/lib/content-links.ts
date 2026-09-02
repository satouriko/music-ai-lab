import { posix } from 'node:path';

import type { ContentKind } from './content-types';
import { withSiteBasePath } from './site-path';

const routeByKind: Record<ContentKind, string> = {
  note: 'notes',
  code: 'code',
  notebook: 'notebooks',
};

export function contentHref(
  kind: ContentKind,
  repositoryPath: string,
  basePath = '',
) {
  const encodedPath = repositoryPath
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/');
  return withSiteBasePath(`/${routeByKind[kind]}/${encodedPath}/`, basePath);
}

export function resolveRepositoryLink(
  sourcePath: string,
  href: string,
  knownPaths: ReadonlyMap<string, ContentKind>,
) {
  if (href.startsWith('#')) return href;
  if (/^(?:https?:|mailto:)/i.test(href)) return href;
  if (href.startsWith('/') || /^[a-z][a-z\d+.-]*:/i.test(href)) return null;

  const hashIndex = href.indexOf('#');
  const rawPath = hashIndex === -1 ? href : href.slice(0, hashIndex);
  const hash = hashIndex === -1 ? '' : href.slice(hashIndex);

  let decodedPath;
  try {
    decodedPath = decodeURIComponent(rawPath);
  } catch {
    return null;
  }

  const targetPath = posix.normalize(
    posix.join(posix.dirname(sourcePath), decodedPath),
  );
  if (targetPath === '..' || targetPath.startsWith('../')) return null;

  const targetKind = knownPaths.get(targetPath);
  if (!targetKind) return null;
  return `${contentHref(targetKind, targetPath)}${hash}`;
}
