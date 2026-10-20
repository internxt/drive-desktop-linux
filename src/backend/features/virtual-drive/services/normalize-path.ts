import { posix } from 'node:path';

export function normalizePath(requestedPath: string) {
  const normalizedPath = posix.normalize(requestedPath || '/');

  return normalizedPath === '.' ? '/' : normalizedPath.startsWith('/') ? normalizedPath : `/${normalizedPath}`;
}
