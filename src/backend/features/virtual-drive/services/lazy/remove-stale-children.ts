import { FileRepository } from '../../../../../context/virtual-drive/files/domain/FileRepository';
import { Folder } from '../../../../../context/virtual-drive/folders/domain/Folder';
import { FolderRepository } from '../../../../../context/virtual-drive/folders/domain/FolderRepository';
import { isVirtualTrashFolder } from '../drive-folder/seed-virtual-drive-root-folders';
import { DirectoryStateRepository } from './directory-state-sqlite-repository';

type Props = {
  folder: Folder;
  folderRepository: FolderRepository;
  fileRepository: FileRepository;
  remoteFolderUuids: Set<string>;
  remoteFileUuids: Set<string>;
  remoteFolderPaths: Map<string, string>;
};

export async function removeStaleChildren({
  folder,
  folderRepository,
  fileRepository,
  remoteFolderUuids,
  remoteFileUuids,
  remoteFolderPaths,
}: Props) {
  // /.Trash is local. It is absent from the remote listing and must survive a refresh.
  const removedFolderChildren = folderRepository
    .matchingPartial({ parentId: folder.id })
    .filter(
      (child) =>
        !isVirtualTrashFolder(child) &&
        (!remoteFolderUuids.has(child.uuid) || remoteFolderPaths.get(child.uuid) !== child.path),
    );

  const staleFolders = staleFolderTree({ removedFolderChildren, folderRepository });

  const staleFiles = fileRepository
    .matchingPartial({ folderId: folder.id })
    .filter((child) => !remoteFileUuids.has(child.uuid));

  await Promise.all([
    ...staleFolders.map(async (staleFolder) => {
      await DirectoryStateRepository.invalidate({ folderId: staleFolder.id, statusScope: 'EXISTS' });
      await folderRepository.delete(staleFolder.id);
    }),
    ...staleFiles.map((child) => fileRepository.delete(child.uuid)),
    ...removedFolderChildren.map((child) => fileRepository.deleteByFolderPath(child.path)),
  ]);
}

function staleFolderTree({
  removedFolderChildren,
  folderRepository,
}: {
  removedFolderChildren: Array<Folder>;
  folderRepository: FolderRepository;
}) {
  return removedFolderChildren
    .flatMap((child) => [child, ...folderRepository.searchByPathPrefix(`${child.path}/`)])
    .sort((left, right) => right.path.length - left.path.length);
}
