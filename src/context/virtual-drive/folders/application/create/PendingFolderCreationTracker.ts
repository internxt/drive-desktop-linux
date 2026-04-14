import { posix } from 'node:path';
import { Service } from 'diod';

type RunAfterParentCreationsPops<T> = {
  path: string;
  action: () => Promise<T>;
};

function normalizePath(path: string): string {
  const normalizedPath = posix.normalize(path);

  if (normalizedPath.length > 1 && normalizedPath.endsWith('/')) {
    return normalizedPath.slice(0, -1);
  }

  return normalizedPath;
}

function getParentPaths(path: string): string[] {
  const normalizedPath = normalizePath(path);
  const parentPaths: string[] = [];

  let currentPath = posix.dirname(normalizedPath);

  while (currentPath !== '.' && currentPath !== '/') {
    parentPaths.unshift(currentPath);
    currentPath = posix.dirname(currentPath);
  }

  return parentPaths;
}

@Service()
export class PendingFolderCreationTracker {
  private readonly pendingFolderCreationByPath = new Map<string, Promise<void>>();

  async runAfterParentCreations<T>({ path, action }: RunAfterParentCreationsPops<T>): Promise<T> {
    const pendingParentCreations = this.getPendingParentCreations(path);

    if (pendingParentCreations.length > 0) {
      await Promise.all(pendingParentCreations);
    }

    return action();
  }

  async runTrackingCreation<T>({ path, action }: RunAfterParentCreationsPops<T>): Promise<T> {
    const pendingParentCreations = this.getPendingParentCreations(path);

    if (pendingParentCreations.length > 0) {
      await Promise.all(pendingParentCreations);
    }

    const creationPromise = action();
    this.track(path, creationPromise);

    return creationPromise;
  }

  private track<T>(path: string, creationPromise: Promise<T>): void {
    const normalizedPath = normalizePath(path);

    const pendingPromise = creationPromise.then(() => undefined).catch(() => undefined);

    this.pendingFolderCreationByPath.set(normalizedPath, pendingPromise);

    void pendingPromise.finally(() => {
      if (this.pendingFolderCreationByPath.get(normalizedPath) === pendingPromise) {
        this.pendingFolderCreationByPath.delete(normalizedPath);
      }
    });
  }

  private getPendingParentCreations(path: string): Promise<void>[] {
    const parentPaths = getParentPaths(path);

    return parentPaths
      .map((parentPath) => this.pendingFolderCreationByPath.get(parentPath))
      .filter((pending): pending is Promise<void> => Boolean(pending));
  }
}
