import { Folder } from '../../../../../context/virtual-drive/folders/domain/Folder';
import { FolderStatuses } from '../../../../../context/virtual-drive/folders/domain/FolderStatus';
import { FolderRepository } from '../../../../../context/virtual-drive/folders/domain/FolderRepository';
import { User } from '../../../../../apps/main/types';
import { TRASH_FOLDER_UUID, TRASH_UID_FOLDER_UUID } from './constants';

type Props = {
  folderRepository: FolderRepository;
  user: User;
};

/**
 * Seeds root (/) and trash (/.Trash) folders into the local folder repository.
 * This allows early FUSE mounting immediately after database initialization,
 * before the full remote sync completes. Real folders will be lazily loaded
 * on demand as directories are opened.
 */
export async function seedVirtualDriveRootFolders({ folderRepository, user }: Props) {
  const now = new Date().toISOString();

  const rootFolder = Folder.from({
    uuid: user.rootFolderId,
    path: '/',
    updatedAt: now,
    createdAt: now,
    status: FolderStatuses.EXISTS,
  });

  const trashFolder = Folder.from({
    uuid: TRASH_FOLDER_UUID,
    parentUuid: user.rootFolderId,
    path: '/.Trash',
    updatedAt: now,
    createdAt: now,
    status: FolderStatuses.EXISTS,
  });

  await folderRepository.add(rootFolder);
  await folderRepository.add(trashFolder);

  const uid = process.getuid?.();
  if (uid !== undefined) {
    const trashUidFolder = Folder.from({
      uuid: TRASH_UID_FOLDER_UUID,
      parentUuid: user.rootFolderId,
      path: `/.Trash-${uid}`,
      updatedAt: now,
      createdAt: now,
      status: FolderStatuses.EXISTS,
    });
    await folderRepository.add(trashUidFolder);
  }
}
