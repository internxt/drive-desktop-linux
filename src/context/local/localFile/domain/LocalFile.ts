import { AggregateRoot } from '../../../shared/domain/AggregateRoot';
import { Primitives } from '../../../shared/domain/value-objects/ValueObject';
import { AbsolutePath } from '../infrastructure/AbsolutePath';

export type LocalFileAttributes = {
  path: AbsolutePath;
  modifiedTime: number;
  size: number;
};

export class LocalFile extends AggregateRoot {
  private constructor(
    private readonly _path: AbsolutePath,
    private readonly _modifiedTime: number,
    private readonly _size: number
  ) {
    super();
  }

  get path() {
    return this._path;
  }

  get modifiedTime() {
    return this._modifiedTime;
  }

  get size() {
    return this._size;
  }

  static from(attributes: LocalFileAttributes): LocalFile {
    return new LocalFile(
      attributes.path,
      attributes.modifiedTime,
      attributes.size
    );
  }

  attributes(): Record<string, Primitives> {
    return {
      path: this.path as string,
      modifiedTime: this.modifiedTime,
      size: this.size,
    };
  }
}
