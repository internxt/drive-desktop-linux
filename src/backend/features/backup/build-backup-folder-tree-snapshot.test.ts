import { buildBackupFolderTreeSnapshot } from './build-backup-folder-tree-snapshot';

describe('build-backup-folder-tree-snapshot', () => {
  it('should accumulate all file sizes and decrypted names across tree', () => {
    const decryptFileName = vi.fn((name: string) => `dec:${name}`);
    const tree = {
      id: 1,
      uuid: 'folder-root-uuid',
      plainName: 'root',
      files: [{ id: 101, uuid: 'file-f1-uuid', name: 'f1', folderId: 1, size: '2' }],
      children: [
        {
          id: 2,
          uuid: 'folder-child-uuid',
          plainName: 'child',
          files: [{ id: 102, uuid: 'file-f2-uuid', name: 'f2', folderId: 2, size: '3' }],
          children: [],
        },
      ],
    };

    const result = buildBackupFolderTreeSnapshot({ tree: tree as never, decryptFileName });

    expect(result.size).toBe(5);
    expect(result.folderDecryptedNames).toStrictEqual({
      'folder-root-uuid': 'root',
      'folder-child-uuid': 'child',
    });
    expect(result.fileDecryptedNames).toStrictEqual({
      'file-f1-uuid': 'dec:f1',
      'file-f2-uuid': 'dec:f2',
    });
    expect(decryptFileName).toBeCalledTimes(2);
  });
});
