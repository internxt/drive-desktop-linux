import { listOrphanFolderUuidsUnderDeviceSqlite } from './list-orphan-folder-uuids-under-device-sqlite';

describe('list-orphan-folder-uuids-under-device-sqlite', () => {
  it('returns uuids of direct children not in backup folder id set', async () => {
    const folders = {
      getAllWhere: vi.fn().mockResolvedValue({
        success: true,
        result: [
          { id: 10, uuid: 'keep-uuid' },
          { id: 20, uuid: 'orphan-uuid' },
        ],
      }),
    };

    const uuids = await listOrphanFolderUuidsUnderDeviceSqlite({
      folders: folders as never,
      deviceFolderId: 1,
      backups: [{ folderId: 10 }],
    });

    expect(uuids).toStrictEqual(['orphan-uuid']);
  });
});
