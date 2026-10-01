import { mockDeep } from 'vitest-mock-extended';
import { FolderRepository } from '../../../../../context/virtual-drive/folders/domain/FolderRepository';
import { Folder } from '../../../../../context/virtual-drive/folders/domain/Folder';
import {
  isVirtualTrashFolder,
  isVirtualTrashPath,
  seedVirtualDriveRootFolders,
  TRASH_FOLDER_ID,
  TRASH_FOLDER_UUID,
  TRASH_UID_FOLDER_ID,
  TRASH_UID_FOLDER_UUID,
} from './seed-virtual-drive-root-folders';
import { User } from '../../../../../apps/main/types';

describe('seed-virtual-drive-root-folders', () => {
  const folderRepository = mockDeep<FolderRepository>();
  const mockUser: User = {
    id: 10,
    name: 'Test',
    lastname: 'User',
    email: 'test@example.com',
    uuid: 'user-uuid',
    root_folder_id: 100,
    rootFolderId: '11111111-2222-4333-8444-555555555555',
    avatar: '',
    bucket: 'bucket-id',
    backupsBucket: 'backups-bucket',
    bridge_user: 'bridge',
    userId: '10',
    mnemonic: 'secret',
  };

  beforeEach(() => {
    folderRepository.add.mockResolvedValue(undefined);
  });

  it('should seed root (/) and trash (/.Trash) folders into repository', async () => {
    const originalGetuid = process.getuid;
    // @ts-expect-error test override
    process.getuid = undefined;

    try {
      await seedVirtualDriveRootFolders({ folderRepository, user: mockUser });

      expect(folderRepository.add).toHaveBeenCalledTimes(2);

      const addedFolders: Folder[] = folderRepository.add.mock.calls.map(([f]) => f);
      const root = addedFolders.find((f) => f.path === '/');
      const trash = addedFolders.find((f) => f.path === '/.Trash');

      expect(root).toBeDefined();
      expect(root?.id).toBe(100);
      expect(root?.uuid).toBe('11111111-2222-4333-8444-555555555555');
      expect(root?.parentId).toBeUndefined();

      expect(trash).toBeDefined();
      expect(trash?.id).toBe(TRASH_FOLDER_ID);
      expect(trash?.uuid).toBe(TRASH_FOLDER_UUID);
      expect(trash?.parentId).toBe(100);
    } finally {
      process.getuid = originalGetuid;
    }
  });

  it('should also seed /.Trash-${uid} when process.getuid is defined', async () => {
    const originalGetuid = process.getuid;
    // @ts-expect-error test override
    process.getuid = () => 1000;

    try {
      await seedVirtualDriveRootFolders({ folderRepository, user: mockUser });

      expect(folderRepository.add).toHaveBeenCalledTimes(3);

      const addedFolders: Folder[] = folderRepository.add.mock.calls.map(([f]) => f);
      const trashUid = addedFolders.find((f) => f.path === '/.Trash-1000');

      expect(trashUid).toBeDefined();
      expect(trashUid?.id).toBe(TRASH_UID_FOLDER_ID);
      expect(trashUid?.uuid).toBe(TRASH_UID_FOLDER_UUID);
      expect(trashUid?.parentId).toBe(100);
    } finally {
      process.getuid = originalGetuid;
    }
  });

  describe('isVirtualTrashPath', () => {
    it('should return true for paths starting with /.Trash', () => {
      expect(isVirtualTrashPath('/.Trash')).toBe(true);
      expect(isVirtualTrashPath('/.Trash-1000')).toBe(true);
      expect(isVirtualTrashPath('/.Trash-1000/info')).toBe(true);
    });

    it('should return false for paths outside the virtual trash folders', () => {
      expect(isVirtualTrashPath('/')).toBe(false);
      expect(isVirtualTrashPath('/Trash')).toBe(false);
      expect(isVirtualTrashPath('/Documents/.Trash')).toBe(false);
      expect(isVirtualTrashPath('/.Trashcan')).toBe(false);
      expect(isVirtualTrashPath('/.Trash-1000-old')).toBe(false);
    });
  });

  describe('isVirtualTrashFolder', () => {
    it('should return true for /.Trash and /.Trash-* paths', () => {
      expect(isVirtualTrashFolder({ path: '/.Trash', id: 1 })).toBe(true);
      expect(isVirtualTrashFolder({ path: '/.Trash-1000', id: 2 })).toBe(true);
      expect(isVirtualTrashFolder({ path: '/.Trash-1000/info', id: 3 })).toBe(true);
    });

    it('should return true for TRASH_FOLDER_ID and TRASH_UID_FOLDER_ID', () => {
      expect(isVirtualTrashFolder({ path: '/some-path', id: TRASH_FOLDER_ID })).toBe(true);
      expect(isVirtualTrashFolder({ path: '/some-path', id: TRASH_UID_FOLDER_ID })).toBe(true);
    });

    it('should return false for normal folders', () => {
      expect(isVirtualTrashFolder({ path: '/', id: 100 })).toBe(false);
      expect(isVirtualTrashFolder({ path: '/Documents', id: 101 })).toBe(false);
      expect(isVirtualTrashFolder({ path: '/Photos', id: 102 })).toBe(false);
    });
  });
});
