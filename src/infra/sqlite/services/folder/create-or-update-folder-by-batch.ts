import { logger } from '@internxt/drive-desktop-core/build/backend';
import { parseData } from './parse-data';
import { SqliteError } from '../common/sqlite-error';
import { RemoteSyncedFolder } from 'src/apps/main/remote-sync/helpers';
import { AppDataSource } from '../../../../apps/main/database/data-source';
import { DriveFolder } from '../../../../apps/main/database/entities/DriveFolder';

const BATCH_SIZE = 500;

type Props = {
  folders: RemoteSyncedFolder[];
};

export async function createOrUpdateFolderByBatch({ folders }: Props) {
  if (folders.length === 0) return { data: [] };

  try {
    await AppDataSource.transaction(async (manager) => {
      const repository = manager.getRepository(DriveFolder);

      for (let i = 0; i < folders.length; i += BATCH_SIZE) {
        const chunk = folders.slice(i, i + BATCH_SIZE);
        const upsertChunk = chunk.map((folder) => ({
          ...folder,
          parentId: folder.parentId ?? undefined,
          bucket: folder.bucket ?? undefined,
        }));

        await repository.upsert(upsertChunk, {
          conflictPaths: ['uuid'],
        });
      }
    });

    return { data: folders.map((data) => parseData({ data })) };
  } catch (error) {
    logger.error({
      msg: 'Error batch creating or updating folders',
      count: folders.length,
      error,
    });

    return { error: new SqliteError('UNKNOWN', error) };
  }
}
