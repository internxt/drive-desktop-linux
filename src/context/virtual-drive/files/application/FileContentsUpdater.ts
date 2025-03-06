import { RemoteFileSystem } from '../domain/file-systems/RemoteFileSystem';
import { FileContentsId } from '../domain/FileContentsId';
import { FileFolderId } from '../domain/FileFolderId';
import { FilePath } from '../domain/FilePath';
import { FileSize } from '../domain/FileSize';
import Logger from 'electron-log';
import { Service } from 'diod';
import { LocalFileHandler } from '../../../local/localFile/domain/LocalFileUploader';
import { AbsolutePath } from '../../../local/localFile/infrastructure/AbsolutePath';
import { getRootVirtualDrive } from '../../../../apps/main/virtual-root-folder/service';
import path from 'path';
import { StorageFileAttributes } from '../../../storage/StorageFiles/domain/StorageFile';
import { Either, left, right } from '../../../shared/domain/Either';
import { StorageFileId } from '../../../storage/StorageFiles/domain/StorageFileId';

interface HardUpdateParams {
  attributes: StorageFileAttributes;
  file: {
    path: string;
    folderId: number;
  }
}

interface HardUpdateResponse {
  oldId: StorageFileId;
  newId: string;
}

@Service()
export class FileContentsUpdater {
  constructor(
    private readonly remote: RemoteFileSystem,
    private readonly fileUploader: LocalFileHandler
  ) {}

  async hardUpdateRun(params: HardUpdateParams): Promise<Either<Error,HardUpdateResponse>> {
    Logger.info(
      `[DANGLING FILE] attempting to reupload ${params.attributes.id}`
    );
    try {
      const signal = AbortSignal.timeout(42949672);
      const rootPath = getRootVirtualDrive();
      const absolutePath = path.join(rootPath, params.file.path);

      // Create new file, upload it to the bucket and persist it with the new content id
      const contentEither = await this.fileUploader.upload(
        absolutePath as unknown as AbsolutePath,
        params.attributes.size,
        signal
      );

      if (contentEither.isLeft()) {
        const error = contentEither.getLeft();
        Logger.error(
          `[DANGLING FILE] error uploading file ${params.attributes.id} with error: ${error}`
        );
        return left(error);
      }
      if (contentEither.isRight()) {
        Logger.info(`[DANGLING FILE] uploaded ${params.attributes.id}`);
        await this.remote.hardDelete(params.attributes.id);
        const contentsId = contentEither.getRight();

        await this.remote.persist({
          contentsId: new FileContentsId(contentsId),
          path: new FilePath(params.file.path),
          size: new FileSize(params.attributes.size),
          folderId: new FileFolderId(params.file.folderId),
        });
        Logger.info(`[DANGLING FILE] persisted ${params.attributes.id}`);
        return right({ oldId: new StorageFileId(params.attributes.id), newId: contentsId });
      }
      return left(new Error('Unknown error'));
    } catch (error) {
      Logger.error(
        `[DANGLING FILE] error updating file ${params.attributes.id} with error: ${error}`
      );
      return left(new Error('Unknown error'));
    }
  }
}
