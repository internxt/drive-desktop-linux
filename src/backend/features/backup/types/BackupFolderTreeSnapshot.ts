import { FolderTree } from '@internxt/sdk/dist/drive/storage/types';

export type BackupFolderTreeSnapshot = {
  tree: FolderTree;
  folderDecryptedNames: Record<string, string>;
  fileDecryptedNames: Record<string, string>;
  size: number;
};
