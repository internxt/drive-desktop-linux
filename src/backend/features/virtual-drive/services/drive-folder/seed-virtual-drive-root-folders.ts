import { Folder } from '../../../../../context/virtual-drive/folders/domain/Folder';
import { FolderStatuses } from '../../../../../context/virtual-drive/folders/domain/FolderStatus';
import { FolderRepository } from '../../../../../context/virtual-drive/folders/domain/FolderRepository';
import { UserDto } from '../../../../../infra/drive-server/out/dto';
import { TRASH_FOLDER_ID, TRASH_FOLDER_UUID, TRASH_UID_FOLDER_ID, TRASH_UID_FOLDER_UUID } from './constants';

type Props = {
  folderRepository: FolderRepository;
  user: UserDto;
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
    id: user.root_folder_id,
    uuid: user.rootFolderId,
    parentId: null,
    path: '/',
    updatedAt: now,
    createdAt: now,
    status: FolderStatuses.EXISTS,
  });

  const trashFolder = Folder.from({
    id: TRASH_FOLDER_ID,
    uuid: TRASH_FOLDER_UUID,
    parentId: user.root_folder_id,
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
      id: TRASH_UID_FOLDER_ID,
      uuid: TRASH_UID_FOLDER_UUID,
      parentId: user.root_folder_id,
      path: `/.Trash-${uid}`,
      updatedAt: now,
      createdAt: now,
      status: FolderStatuses.EXISTS,
    });
    await folderRepository.add(trashUidFolder);
  }
}
