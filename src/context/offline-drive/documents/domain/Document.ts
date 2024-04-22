import { AggregateRoot } from '../../../shared/domain/AggregateRoot';
import { DocumentId } from './DocumentId';
import { DocumentPath } from './DocumentPath';
import { DocumentSize } from './DocumentSize';

export type DocumentAttributes = {
  id: string;
  createdAt: Date;
  modifiedAt: Date;
  path: string;
  size: number;
};

export class Document extends AggregateRoot {
  private static readonly TEMPORAL_EXTENSION = 'tmp';
  private static readonly LOCK_FILE_NAME_PREFIX = '.~lock.';
  private static readonly OUTPUT_STREAM_NAME_PREFIX = '.~lock.';

  private constructor(
    private _id: DocumentId,
    private _createdAt: Date,
    private _path: DocumentPath,
    private _size: DocumentSize,
    private readonly _modifiedTime: Date
  ) {
    super();
  }

  public get id() {
    return this._id;
  }
  public get createdAt() {
    return this._createdAt;
  }
  public get path() {
    return this._path;
  }
  public get size() {
    return this._size;
  }

  public get name() {
    return this._path.name();
  }

  public get extension() {
    return this._path.extension();
  }

  public get modifiedTime() {
    return this._modifiedTime;
  }

  static create(path: DocumentPath, size: DocumentSize): Document {
    const id = DocumentId.create();
    const createdAt = new Date();

    const file = new Document(id, createdAt, path, size, createdAt);

    return file;
  }

  static from(attributes: DocumentAttributes): Document {
    return new Document(
      new DocumentId(attributes.id),
      attributes.createdAt,
      new DocumentPath(attributes.path),
      new DocumentSize(attributes.size),
      attributes.modifiedAt
    );
  }

  increaseSizeBy(bytes: number): void {
    this._size = this._size.increment(bytes);
  }

  isAuxiliary(): boolean {
    const isLockFile = this.isLockFile();
    const isTemporal = this.isTemporal();
    const isOutputStream = this.isOutputStream();

    return isLockFile || isTemporal || isOutputStream;
  }

  isLockFile(): boolean {
    return this.name.startsWith(Document.LOCK_FILE_NAME_PREFIX);
  }

  isTemporal(): boolean {
    return this.extension === Document.TEMPORAL_EXTENSION;
  }

  isOutputStream(): boolean {
    return this.name.startsWith(Document.OUTPUT_STREAM_NAME_PREFIX);
  }

  attributes(): DocumentAttributes {
    return {
      id: this._id.value,
      createdAt: this._createdAt,
      modifiedAt: this._modifiedTime,
      path: this._path.value,
      size: this._size.value,
    };
  }
}
