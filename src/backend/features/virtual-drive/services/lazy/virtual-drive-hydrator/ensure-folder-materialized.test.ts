import { describe, expect, it, vi } from 'vitest';
import type { Folder } from '../../../../../../context/virtual-drive/folders/domain/Folder';
import type { FolderRepository } from '../../../../../../context/virtual-drive/folders/domain/FolderRepository';
import { ensureFolderMaterialized } from './ensure-folder-materialized';

describe('ensure-folder-materialized', () => {
  it('should return the root folder for root paths', async () => {
    const root = { id: 1, uuid: 'root', path: '/' } as unknown as Folder;
    const folderRepository = {
      matchingPartial: vi.fn().mockReturnValue([root]),
    } as unknown as FolderRepository;
    const refreshChildrenIfNeeded = vi.fn();

    await expect(
      ensureFolderMaterialized({
        requestedPath: '/',
        statusScope: 'EXISTS',
        folderRepository,
        refreshChildrenIfNeeded,
      }),
    ).resolves.toBe(root);

    expect(refreshChildrenIfNeeded).not.toHaveBeenCalled();
  });

  it('should hydrate missing segments before returning a folder', async () => {
    const root = { id: 1, uuid: 'root', path: '/' } as unknown as Folder;
    const docs = { id: 2, uuid: 'docs', path: '/docs' } as unknown as Folder;
    let hydrated = false;

    const folderRepository = {
      matchingPartial: vi.fn(({ path }: { path: string }) => {
        if (path === '/') return [root];
        if (path === '/docs') return hydrated ? [docs] : [];
        return [];
      }),
    } as unknown as FolderRepository;
    const refreshChildrenIfNeeded = vi.fn(async () => {
      hydrated = true;
    });

    await expect(
      ensureFolderMaterialized({
        requestedPath: '/docs',
        statusScope: 'EXISTS',
        folderRepository,
        refreshChildrenIfNeeded,
      }),
    ).resolves.toBe(docs);

    expect(refreshChildrenIfNeeded).toHaveBeenCalledTimes(1);
  });
});
