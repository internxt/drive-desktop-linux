import { DriveItemStatus } from '@internxt/drive-desktop-core/build/backend';
import { listOrphanFolderUuidsUnderDeviceSqlite } from './list-orphan-folder-uuids-under-device-sqlite';

describe('list-orphan-folder-uuids-under-device-sqlite', () => {
  it('returns uuids of direct children not in backup folder uuid set', async () => {
    const folders = {
      getAllWhere: vi.fn().mockResolvedValue({
        success: true,
        result: [
          { uuid: 'keep-uuid' },
          { uuid: 'orphan-uuid' },
        ],
      }),
    };

    const uuids = await listOrphanFolderUuidsUnderDeviceSqlite({
      folders: folders as never,
      deviceFolderUuid: 'device-folder-uuid',
      backups: [{ folderUuid: 'keep-uuid' }],
    });

    expect(folders.getAllWhere).toHaveBeenCalledWith({
      parentUuid: 'device-folder-uuid',
      status: DriveItemStatus.EXISTS,
    });
    expect(uuids).toStrictEqual(['orphan-uuid']);
  });
});