import { ServerFileStatus } from '../../../../../context/shared/domain/ServerFile';
import { ServerFolderStatus } from '../../../../../context/shared/domain/ServerFolder';
import { toRemoteFile, toRemoteFolder } from './remote-synced-mappers';

describe('remote-synced-mappers', () => {
  it('should map remote folders as existing', () => {
    const folder = toRemoteFolder({
      type: 'folder',
      id: 1,
      parentId: 0,
      bucket: 'bucket',
      userId: 2,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-02T00:00:00.000Z',
      uuid: 'folder-uuid',
      plainName: 'Documents',
      name: 'Documents',
    });

    expect(folder).toMatchObject({
      id: 1,
      parentId: 0,
      plainName: 'Documents',
      status: ServerFolderStatus.EXISTS,
    });
  });

  it('should normalize nullable identifiers and size for remote files', () => {
    const file = toRemoteFile({
      id: 1,
      uuid: 'file-uuid',
      fileId: null,
      type: 'txt',
      size: '42',
      bucket: 'bucket',
      folderId: 2,
      folderUuid: 'folder-uuid',
      userId: 3,
      modificationTime: '2026-01-01T00:00:00.000Z',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-02T00:00:00.000Z',
      plainName: 'notes',
      name: 'notes.txt',
    });

    expect(file).toMatchObject({
      fileId: '',
      size: 42,
      plainName: 'notes',
      status: ServerFileStatus.EXISTS,
    });
  });
});
