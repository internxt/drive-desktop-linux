import { AggregateRoot } from '../../../shared/domain/AggregateRoot';
import { AbsolutePath } from '../../localFile/infrastructure/AbsolutePath';

export type RemoteFileAttributes = {
  uuid: string;
  folderId: number;
  path: AbsolutePath;
  modificationTime: number;
  size: number;
};

export class PersistedRemoteFile extends AggregateRoot {
  private constructor(
    private _uuid: string,
    private _folderId: number,
    private _path: AbsolutePath,
    private _modificationTime: number,
    private _size: number
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

  static from(attributes: RemoteFileAttributes): PersistedRemoteFile {
    return new PersistedRemoteFile(
      attributes.uuid,
      attributes.folderId,
      attributes.path,
      attributes.modificationTime,
      attributes.size
    );
  }

  attributes(): RemoteFileAttributes {
    return {
      uuid: this._uuid,
      folderId: this._folderId,
      path: this.path,
      modificationTime: this.modificationTime,
      size: this.size,
    };
  }
}
