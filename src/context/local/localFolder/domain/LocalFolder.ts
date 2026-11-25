import path from 'path';
import { AggregateRoot } from '../../../shared/domain/AggregateRoot';
import { AbsolutePath } from '../../localFile/infrastructure/AbsolutePath';

export type LocalFolderAttributes = {
  path: AbsolutePath;
  modificationTime: number;
  creationTime: number;
};

export class LocalFolder extends AggregateRoot {
  private constructor(
    private _path: AbsolutePath,
    private _modificationTime: number,
    private _creationTime: number,
  ) {
    super();
  }

  get path(): AbsolutePath {
    return this._path;
  }

  get modificationTime(): number {
    return this._modificationTime;
  }

  get creationTime(): number {
    return this._creationTime;
  }

  basedir(): string {
    const dirname = path.posix.dirname(this._path);
    if (dirname === '.') {
      return path.posix.sep;
    }

    return dirname;
  }

  static from(path: AbsolutePath, modificationTime: number, creationTime: number): LocalFolder {
    return new LocalFolder(path, modificationTime, creationTime);
  }

  attributes(): LocalFolderAttributes {
    return {
      path: this._path,
      modificationTime: this._modificationTime,
      creationTime: this._creationTime,
    };
  }
}
