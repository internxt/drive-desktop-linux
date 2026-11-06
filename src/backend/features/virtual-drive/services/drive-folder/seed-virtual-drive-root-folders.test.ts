import { mockDeep } from 'vitest-mock-extended';
import { FolderRepository } from '../../../../../context/virtual-drive/folders/domain/FolderRepository';
import { Folder } from '../../../../../context/virtual-drive/folders/domain/Folder';
import { TRASH_FOLDER_UUID, TRASH_UID_FOLDER_UUID } from './constants';
import { seedVirtualDriveRootFolders } from './seed-virtual-drive-root-folders';
import { User } from '../../../../../apps/main/types';

describe('seed-virtual-drive-root-folders', () => {
  const folderRepository = mockDeep<FolderRepository>();
  const mockUser: User = mockDeep<User>({
    root_folder_id: 100,
    rootFolderId: '11111111-2222-4333-8444-555555555555',
  });

  beforeEach(() => {
    folderRepository.add.mockResolvedValue(undefined);
  });

  it('should seed root (/) and trash (/.Trash) folders into repository', async () => {
    const originalGetuid = process.getuid;
    process.getuid = undefined;

    try {
      await seedVirtualDriveRootFolders({ folderRepository, user: mockUser });

      expect(folderRepository.add).toHaveBeenCalledTimes(2);

      const addedFolders: Folder[] = folderRepository.add.mock.calls.map(([f]) => f);
      const root = addedFolders.find((f) => f.path === '/');
      const trash = addedFolders.find((f) => f.path === '/.Trash');

      expect(root).toBeDefined();
      expect(root?.uuid).toBe('11111111-2222-4333-8444-555555555555');
      expect(root?.parentUuid).toBeUndefined();

      expect(trash).toBeDefined();
      expect(trash?.uuid).toBe(TRASH_FOLDER_UUID);
      expect(trash?.parentUuid).toBe('11111111-2222-4333-8444-555555555555');
    } finally {
      process.getuid = originalGetuid;
    }
  });

  it('should also seed /.Trash-${uid} when process.getuid is defined', async () => {
    const originalGetuid = process.getuid;
    process.getuid = () => 1000;

    try {
      await seedVirtualDriveRootFolders({ folderRepository, user: mockUser });

      expect(folderRepository.add).toHaveBeenCalledTimes(3);

      const addedFolders: Folder[] = folderRepository.add.mock.calls.map(([f]) => f);
      const trashUid = addedFolders.find((f) => f.path === '/.Trash-1000');

      expect(trashUid).toBeDefined();
      expect(trashUid?.uuid).toBe(TRASH_UID_FOLDER_UUID);
      expect(trashUid?.parentUuid).toBe('11111111-2222-4333-8444-555555555555');
    } finally {
      process.getuid = originalGetuid;
    }
  });
});
