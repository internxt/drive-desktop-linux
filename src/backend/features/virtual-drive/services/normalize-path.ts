import { posix } from 'node:path';

export function normalizePath(requestedPath: string) {
  const normalizedPath = posix.normalize(requestedPath || '/');

  if (normalizedPath === '.') return '/';
  if (normalizedPath.startsWith('/')) return normalizedPath;

  return `/${normalizedPath}`;
}
