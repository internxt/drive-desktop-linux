import { Service } from 'diod';
import { getUpdatedRemoteItems, startRemoteSync } from '../../../../apps/main/remote-sync/service';
import { ServerFile } from '../../../shared/domain/ServerFile';
import { ServerFolder } from '../../../shared/domain/ServerFolder';
import { RemoteItemsGenerator } from '../domain/RemoteItemsGenerator';

@Service()
export class SQLiteRemoteItemsGenerator implements RemoteItemsGenerator {
  async getAll(): Promise<{ files: ServerFile[]; folders: ServerFolder[] }> {
    const result = await getUpdatedRemoteItems();

    const files = result.files.map<ServerFile>((updatedFile) => {
      return {
        bucket: updatedFile.bucket,
        createdAt: updatedFile.createdAt,
        encrypt_version: '03-aes',
        fileId: updatedFile.fileId,
        folderUuid: updatedFile.folderUuid,
        modificationTime: updatedFile.modificationTime,
        name: updatedFile.plainName,
        plainName: updatedFile.plainName,
        size: updatedFile.size,
        type: updatedFile.type ?? '',
        updatedAt: updatedFile.updatedAt,
        userId: updatedFile.userId,
        status: updatedFile.status,
        uuid: updatedFile.uuid,
      };
    });

    const folders = result.folders.map<ServerFolder>((updatedFolder) => {
      return {
        bucket: updatedFolder.bucket ?? null,
        createdAt: updatedFolder.createdAt,
        name: updatedFolder.plainName,
        parentUuid: updatedFolder.parentUuid ?? null,
        updatedAt: updatedFolder.updatedAt,
        plain_name: updatedFolder.plainName,
        status: updatedFolder.status,
        uuid: updatedFolder.uuid,
      };
    });

    return { files, folders };
  }

  async forceRefresh(): Promise<void> {
    await startRemoteSync();
  }
}
