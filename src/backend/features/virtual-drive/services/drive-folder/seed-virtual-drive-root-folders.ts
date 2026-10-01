import { Folder } from '../../../../../context/virtual-drive/folders/domain/Folder';
import { FolderStatuses } from '../../../../../context/virtual-drive/folders/domain/FolderStatus';
import { FolderRepository } from '../../../../../context/virtual-drive/folders/domain/FolderRepository';
import { User } from '../../../../../apps/main/types';

export const TRASH_FOLDER_ID = Number.MAX_SAFE_INTEGER;
export const TRASH_FOLDER_UUID = '00000000-0000-4000-8000-000000000001';
export const TRASH_UID_FOLDER_ID = Number.MAX_SAFE_INTEGER - 1;
export const TRASH_UID_FOLDER_UUID = '00000000-0000-4000-8000-000000000002';

export function isVirtualTrashPath(path: string) {
  return /^\/\.Trash(?:$|\/)|^\/\.Trash-\d+(?:$|\/)/.test(path);
}

export function isVirtualTrashFolder(folder: { path: string; id: number }) {
  return isVirtualTrashPath(folder.path) || folder.id >= TRASH_UID_FOLDER_ID;
}

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
