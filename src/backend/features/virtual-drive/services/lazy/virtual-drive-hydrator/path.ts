import path from 'node:path';

export function normalizePath(pathToNormalize: string) {
  const normalized = path.posix.normalize(pathToNormalize || '/');

  if (normalized === '.') {
    return '/';
  }

  return normalized.startsWith('/') ? normalized : `/${normalized}`;
}

export function isRootPath(pathToCheck: string) {
  return pathToCheck === '/' || pathToCheck === '';
}

export function joinVirtualPath(parentPath: string, name: string) {
  return `${parentPath}/${name}`.replaceAll('//', '/');
}
