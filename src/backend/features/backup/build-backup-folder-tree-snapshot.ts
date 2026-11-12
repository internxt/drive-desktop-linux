import { FolderTree } from '@internxt/sdk/dist/drive/storage/types';
import { BackupFolderTreeSnapshot } from './types/BackupFolderTreeSnapshot';

type NodeSnapshot = {
  folderUuid: string;
  folderName: string;
  fileNames: Record<string, string>;
  size: number;
};

type SnapshotProps = {
  node: FolderTree;
  decryptFileName: (name: string, legacyEncryptionFolderId: number) => string;
};

function snapshotNode({ node, decryptFileName }: SnapshotProps): NodeSnapshot {
  const fileNames: Record<string, string> = {};
  let size = 0;

  for (const file of node.files) {
    fileNames[file.uuid] = decryptFileName(file.name, file.folderId);
    size += Number(file.size);
  }

  return { folderUuid: node.uuid, folderName: node.plainName, fileNames, size };
}

type Props = {
  tree: FolderTree;
  decryptFileName: (name: string, legacyEncryptionFolderId: number) => string;
};

export function buildBackupFolderTreeSnapshot({ tree, decryptFileName }: Props): BackupFolderTreeSnapshot {
  let size = 0;
  const folderDecryptedNames: Record<string, string> = {};
  const fileDecryptedNames: Record<string, string> = {};

  const stack = [tree];

  while (stack.length > 0) {
    const currentNode = stack.pop()!;
    const { folderUuid, folderName, fileNames, size: nodeSize } = snapshotNode({ node: currentNode, decryptFileName });

    folderDecryptedNames[folderUuid] = folderName;
    Object.assign(fileDecryptedNames, fileNames);
    size += nodeSize;

    stack.push(...currentNode.children);
  }

  return { tree, folderDecryptedNames, fileDecryptedNames, size };
}
