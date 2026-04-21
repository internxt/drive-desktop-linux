import { FolderTree } from '@internxt/sdk/dist/drive/storage/types';
import { BackupFolderTreeSnapshot } from './BackupFolderTreeSnapshot';

type Props = {
  tree: FolderTree;
  decryptFileName: (name: string, folderId: number) => string;
};

export function buildBackupFolderTreeSnapshot({ tree, decryptFileName }: Props): BackupFolderTreeSnapshot {
  let size = 0;
  const folderDecryptedNames: Record<number, string> = {};
  const fileDecryptedNames: Record<number, string> = {};

  const pendingFolders = [tree];
  while (pendingFolders.length > 0) {
    const currentTree = pendingFolders[0];
    const { folders, files } = {
      folders: currentTree.children,
      files: currentTree.files,
    };

    folderDecryptedNames[currentTree.id] = currentTree.plainName;

    for (const file of files) {
      fileDecryptedNames[file.id] = decryptFileName(file.name, file.folderId);
      size += Number(file.size);
    }

    pendingFolders.shift();
    pendingFolders.push(...folders);
  }

  return {
    tree,
    folderDecryptedNames,
    fileDecryptedNames,
    size,
  };
}
