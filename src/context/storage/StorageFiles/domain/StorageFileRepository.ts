import { Readable } from 'stream';
import { StorageFileId } from './StorageFileId';

export abstract class StorageFileRepository {
  abstract exists(id: StorageFileId): Promise<boolean>;

  abstract store(id: StorageFileId, readable: Readable): Promise<void>;

  abstract read(id: StorageFileId): Promise<Buffer>;

  abstract delete(id: StorageFileId): Promise<void>;

  abstract deleteAll(): Promise<void>;
}
