import { AggregateRoot } from '../../../shared/domain/AggregateRoot';
import { FileFolderId } from '../../../virtual-drive/files/domain/FileFolderId';
import { FilePath } from '../../../virtual-drive/files/domain/FilePath';
import { FileSize } from '../../../virtual-drive/files/domain/FileSize';
import { FileUuid } from '../../../virtual-drive/files/domain/FileUuid';
import { AbsolutePath } from '../../localFile/infrastructure/AbsolutePath';

export type RemoteFileAttributes = {
  path: AbsolutePath;
  modificationTime: number;
  size: number;
};

export class RemoteFile extends AggregateRoot {
  private constructor(
    private _uuid: FileUuid,
    private _path: FilePath,
    private _modificationTime: number,
    private _size: FileSize,
    private _folderId: FileFolderId
  ) {
    super();
  }

  get path(): AbsolutePath {
    return this._path;
  }

  get modificationTime(): number {
    return this._modificationTime;
  }

  get size(): number {
    return this._size;
  }

  static from(attributes: RemoteFileAttributes): RemoteFile {
    return new RemoteFile(
      attributes.path,
      attributes.modificationTime,
      attributes.size
    );
  }

  attributes(): RemoteFileAttributes {
    return {
      path: this.path,
      modificationTime: this.modificationTime,
      size: this.size,
    };
  }
}
