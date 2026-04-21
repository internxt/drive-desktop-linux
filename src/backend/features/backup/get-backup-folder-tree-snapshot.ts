import { aes } from '@internxt/lib';
import { fetchFolderTreeByUuid } from '../../../infra/drive-server/services/folder/services/fetch-folder-tree-by-uuid';
import { buildBackupFolderTreeSnapshot } from '../../../context/shared/domain/backup/build-backup-folder-tree-snapshot';

type Props = {
  folderUuid: string;
};

export async function getBackupFolderTreeSnapshot({ folderUuid }: Props) {
  const { data, error } = await fetchFolderTreeByUuid({ uuid: folderUuid });

  if (error) {
    throw new Error('Unsuccesful request to fetch folder tree');
  }

  const { tree } = data;

  return buildBackupFolderTreeSnapshot({
    tree,
    decryptFileName: (name, folderId) => aes.decrypt(name, `${process.env.NEW_CRYPTO_KEY}-${folderId}`),
  });
}
