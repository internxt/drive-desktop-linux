import { AggregateRoot } from '../../../shared/domain/AggregateRoot';
import { AbsolutePath } from '../../localFile/infrastructure/AbsolutePath';
import { RemoteFileSize } from './RemoteFileSize';

export type RemoteFileAttributes = {
  path: AbsolutePath;
  modificationTime: number;
  size: number;
};

export class RemoteFile extends AggregateRoot {
  private constructor(
    private _path: AbsolutePath,
    private _modificationTime: number,
    private _size: RemoteFileSize
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
    return this._size.value;
  }

  isSmall(): boolean {
    return this._size.isSmall();
  }

  isMedium(): boolean {
    return this._size.isMedium();
  }

  isBig(): boolean {
    return this._size.isBig();
  }

  static from(attributes: RemoteFileAttributes): RemoteFile {
    return new RemoteFile(
      attributes.path,
      attributes.modificationTime,
      new RemoteFileSize(attributes.size)
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
