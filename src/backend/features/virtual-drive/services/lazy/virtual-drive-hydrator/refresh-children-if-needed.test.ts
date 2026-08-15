import { refreshChildrenIfNeeded } from './refresh-children-if-needed';
import type { Folder } from '../../../../../../context/virtual-drive/folders/domain/Folder';
import type { DirectoryStateSqliteRepository } from '../DirectoryStateSqliteRepository';

describe('refresh-children-if-needed', () => {
  const folder = { id: 123 } as Folder;
  const statusScope = 'EXISTS' as const;
  let resolveTask: () => void;

  function createRepository(overrides: Partial<DirectoryStateSqliteRepository> = {}) {
    return {
      isFresh: vi.fn().mockResolvedValue(false),
      ...overrides,
    } as unknown as DirectoryStateSqliteRepository;
  }

  it('should skip refresh when the directory state is fresh', async () => {
    const directoryStateRepository = createRepository({
      isFresh: vi.fn().mockResolvedValue(true),
    });
    const fetchAndStoreChildren = vi.fn();
    const inflight = new Map<string, Promise<void>>();

    await refreshChildrenIfNeeded({
      folder,
      statusScope,
      directoryStateRepository,
      inflight,
      fetchAndStoreChildren,
    });

    expect(directoryStateRepository.isFresh).toHaveBeenCalledWith({ folderId: folder.id, statusScope });
    expect(fetchAndStoreChildren).not.toHaveBeenCalled();
  });

  it('should fetch and store children when the directory state is stale', async () => {
    const directoryStateRepository = createRepository();
    const pendingTask = new Promise<void>((resolve) => {
      resolveTask = resolve;
    });
    const fetchAndStoreChildren = vi.fn().mockReturnValue(pendingTask);
    const inflight = new Map<string, Promise<void>>();

    const resultPromise = refreshChildrenIfNeeded({
      folder,
      statusScope,
      directoryStateRepository,
      inflight,
      fetchAndStoreChildren,
    });

    await Promise.resolve();

    expect(fetchAndStoreChildren).toHaveBeenCalledWith({ folder, statusScope });
    expect(inflight.has('123:EXISTS')).toBe(true);
    expect(inflight.get('123:EXISTS')).toBeInstanceOf(Promise);

    resolveTask();
    await resultPromise;
  });

  it('should reuse an in-flight task for the same cache key', async () => {
    const directoryStateRepository = createRepository();
    const fetchAndStoreChildren = vi.fn().mockResolvedValue(undefined);
    const inflight = new Map<string, Promise<void>>();
    const pendingTask = Promise.resolve();

    inflight.set('123:EXISTS', pendingTask);

    const firstResult = refreshChildrenIfNeeded({
      folder,
      statusScope,
      directoryStateRepository,
      inflight,
      fetchAndStoreChildren,
    });
    const secondResult = refreshChildrenIfNeeded({
      folder,
      statusScope,
      directoryStateRepository,
      inflight,
      fetchAndStoreChildren,
    });

    await expect(firstResult).resolves.toBeUndefined();
    await expect(secondResult).resolves.toBeUndefined();
    expect(fetchAndStoreChildren).not.toHaveBeenCalled();
  });
});
