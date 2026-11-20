import { sumTotalFileSizeInBackupSubtreeSqlite } from './sum-total-file-size-in-backup-subtree-sqlite';

describe('sum-total-file-size-in-backup-subtree-sqlite', () => {
  it('sums file sizes across nested folders with BFS', async () => {
    const files = {
      getAllWhere: vi.fn(),
    };
    const folders = {
      getAllWhere: vi.fn(),
    };

    files.getAllWhere.mockImplementation(async ({ folderUuid }: { folderUuid: string }) => {
      if (folderUuid === 'root-folder-uuid') {
        return { success: true, result: [{ size: 100 }] };
      }
      if (folderUuid === 'child-folder-uuid') {
        return { success: true, result: [{ size: 50 }, { size: 25 }] };
      }
      return { success: true, result: [] };
    });

    folders.getAllWhere.mockImplementation(async ({ parentUuid }: { parentUuid: string }) => {
      if (parentUuid === 'root-folder-uuid') {
        return { success: true, result: [{ uuid: 'child-folder-uuid', plainName: 'sub' }] };
      }
      return { success: true, result: [] };
    });

    const total = await sumTotalFileSizeInBackupSubtreeSqlite({
      files: files as never,
      folders: folders as never,
      rootFolderUuid: 'root-folder-uuid',
    });

    expect(total).toBe(175);
  });
});
