import { extname } from 'node:path';
import { Container } from 'diod';
import { AllFilesInFolderAreAvailableOffline } from '../../../storage/StorageFolders/application/offline/AllFilesInFolderAreAvailableOffline';
import { StorageFileIsAvailableOffline } from '../../../storage/StorageFiles/application/offline/StorageFileIsAvailableOffline';

type Props = {
  path: string;
  container: Container;
};

async function isFileLocallyAvailable({ path, container }: Props) {
  try {
    return await container.get(StorageFileIsAvailableOffline).run(path);
  } catch {
    return false;
  }
}

async function isFolderLocallyAvailable({ path, container }: Props) {
  try {
    return await container.get(AllFilesInFolderAreAvailableOffline).run(path);
  } catch {
    return false;
  }
}

function pathLooksLikeFile(path: string) {
  return extname(path) !== '';
}

export async function isLocallyAvailable({ path, container }: Props) {
  if (pathLooksLikeFile(path)) {
    const fileIsAvailable = await isFileLocallyAvailable({ path, container });
    if (fileIsAvailable) {
      return true;
    }

    return isFolderLocallyAvailable({ path, container });
  }

  const folderIsAvailable = await isFolderLocallyAvailable({ path, container });
  if (folderIsAvailable) {
    return true;
  }

  return isFileLocallyAvailable({ path, container });
}