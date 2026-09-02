function normalizeBasePath(basePath: string) {
  if (!basePath || basePath === '/') return '';
  return `/${basePath.replace(/^\/+|\/+$/g, '')}`;
}

export const siteBasePath = normalizeBasePath(
  process.env.NEXT_PUBLIC_BASE_PATH ?? '',
);

export function withSiteBasePath(
  pathname: string,
  basePath = siteBasePath,
) {
  return `${normalizeBasePath(basePath)}${pathname}`;
}
