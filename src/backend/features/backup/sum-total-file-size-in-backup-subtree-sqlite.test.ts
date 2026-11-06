import { sumTotalFileSizeInBackupSubtreeSqlite } from './sum-total-file-size-in-backup-subtree-sqlite';

describe('sum-total-file-size-in-backup-subtree-sqlite', () => {
  it('sums file sizes across nested folders with BFS', async () => {
    const files = {
      getAllWhere: vi.fn(),
    };
    const folders = {
      getAllWhere: vi.fn(),
    };

    files.getAllWhere.mockImplementation(async ({ folderId }: { folderId: number }) => {
      if (folderId === 1) {
        return { success: true, result: [{ size: 100 }] };
      }
      if (folderId === 2) {
        return { success: true, result: [{ size: 50 }, { size: 25 }] };
      }
      return { success: true, result: [] };
    });

    folders.getAllWhere.mockImplementation(async ({ parentId }: { parentId: number }) => {
      if (parentId === 1) {
        return { success: true, result: [{ id: 2, plainName: 'sub' }] };
      }
      return { success: true, result: [] };
    });

    const total = await sumTotalFileSizeInBackupSubtreeSqlite({
      files: files as never,
      folders: folders as never,
      rootFolderId: 1,
    });

    expect(total).toBe(175);
  });
});
