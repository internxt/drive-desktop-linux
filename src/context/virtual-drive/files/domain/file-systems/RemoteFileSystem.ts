import { Either } from '../../../../shared/domain/Either';
import { DriveDesktopError } from '../../../../shared/domain/errors/DriveDesktopError';
import { FileContentsId } from '../FileContentsId';
import { FilePath } from '../FilePath';
import { FileSize } from '../FileSize';

export type FileDataToPersist = {
  contentsId: FileContentsId;
  path: FilePath;
  size: FileSize;
  folderUuid: string;
  modificationTime?: Date;
};

export type PersistedFileData = {
  modificationTime: string;
  uuid: string;
  createdAt: string;
};

export abstract class RemoteFileSystem {
  abstract persist(offline: FileDataToPersist): Promise<Either<DriveDesktopError, PersistedFileData>>;
}
