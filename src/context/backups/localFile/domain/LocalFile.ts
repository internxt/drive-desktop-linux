import { AggregateRoot } from '../../../shared/domain/AggregateRoot';
import { AbsolutePath } from '../infrastructure/AbsolutePath';

export type LocalFileAttributes = {
  path: AbsolutePath;
  modificationTime: number;
  size: number;
};

export class LocalFile extends AggregateRoot {
  private constructor(
    private readonly _path: AbsolutePath,
    private readonly _modificationTime: number,
    private readonly _size: number
  ) {
    super();
  }

  get path() {
    return this._path;
  }

  get modificationTime() {
    return this._modificationTime;
  }

  get size() {
    return this._size;
  }

  holdsSubpath(otherPath: string): boolean {
    return this._path.endsWith(otherPath);
  }

  static from(attributes: LocalFileAttributes): LocalFile {
    return new LocalFile(
      attributes.path,
      attributes.modificationTime,
      attributes.size
    );
  }

  attributes(): LocalFileAttributes {
    return {
      path: this.path,
      modificationTime: this.modificationTime,
      size: this.size,
    };
  }
}
