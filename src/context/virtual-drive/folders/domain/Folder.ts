import { AggregateRoot } from '../../../shared/domain/AggregateRoot';
import { FolderPath } from './FolderPath';
import { FolderStatus, FolderStatuses } from './FolderStatus';
import { FolderUuid } from './FolderUuid';
import { FolderCreatedDomainEvent } from './events/FolderCreatedDomainEvent';
import { FolderRenamedDomainEvent } from './events/FolderRenamedDomainEvent';
import { createFolderPlaceholderId } from './FolderPlaceholderId';
import { FolderCreatedAt } from './FolderCreatedAt';
import { FolderUpdatedAt } from './FolderUpdatedAt';
import { FolderMovedDomainEvent } from './events/FolderMovedDomainEvent';
import { FolderAlreadyTrashed } from './errors/FolderAlreadyTrashed';

export type FolderAttributes = {
  uuid: string;
  parentUuid?: string;
  path: string;
  updatedAt: string;
  createdAt: string;
  status: string;
};

export class Folder extends AggregateRoot {
  private constructor(
    private _uuid: FolderUuid,
    private _path: FolderPath,
    private _parentUuid: FolderUuid | null,
    public _createdAt: FolderCreatedAt,
    public _updatedAt: FolderUpdatedAt,
    private _status: FolderStatus,
  ) {
    super();
  }

  public get uuid(): string {
    return this._uuid.value;
  }

  public get path(): string {
    return this._path.value;
  }

  public get name() {
    return this._path.name();
  }

  public get dirname(): FolderPath {
    return new FolderPath('/' + this._path.dirname());
  }

  public get parentUuid(): string | undefined {
    return this._parentUuid?.value;
  }

  public get status(): string {
    return this._status.value;
  }

  public get size() {
    return 0;
  }

  public get placeholderId() {
    return createFolderPlaceholderId(this.uuid);
  }

  public get createdAt(): Date {
    return this._createdAt.value;
  }

  public get updatedAt(): Date {
    return this._updatedAt.value;
  }

  public update(attributes: Partial<FolderAttributes>) {
    if (attributes.path) {
      this._path = new FolderPath(attributes.path);
    }

    if (attributes.createdAt) {
      this._createdAt = FolderCreatedAt.fromString(attributes.createdAt);
    }

    if (attributes.updatedAt) {
      this._updatedAt = FolderUpdatedAt.fromString(attributes.updatedAt);
    }

    if (attributes.parentUuid !== undefined) {
      this._parentUuid = attributes.parentUuid ? new FolderUuid(attributes.parentUuid) : null;
    }

    if (attributes.status) {
      this._status = FolderStatus.fromValue(attributes.status);
    }

    return this;
  }

  static from(attributes: FolderAttributes): Folder {
    return new Folder(
      new FolderUuid(attributes.uuid),
      new FolderPath(attributes.path),
      attributes.parentUuid ? new FolderUuid(attributes.parentUuid) : null,
      FolderCreatedAt.fromString(attributes.createdAt),
      FolderUpdatedAt.fromString(attributes.updatedAt),
      FolderStatus.fromValue(attributes.status),
    );
  }

  static create(attributes: Omit<FolderAttributes, 'status'>): Folder {
    const folder = Folder.from({ ...attributes, status: FolderStatuses.EXISTS });

    folder.record(
      new FolderCreatedDomainEvent({
        aggregateId: folder.uuid,
      }),
    );

    return folder;
  }

  moveTo(folder: Folder) {
    if (this.isRoot()) {
      throw new Error('Root folder cannot be moved');
    }

    if (this.isIn(folder)) {
      throw new Error('Cannot move a folder to its current folder');
    }

    const before = this.path;

    this._path = this._path.changeFolder(folder.path);
    this._parentUuid = new FolderUuid(folder.uuid);

    this.record(
      new FolderMovedDomainEvent({
        aggregateId: this.uuid,
        from: before,
        to: this.path,
      }),
    );
  }

  rename(newPath: FolderPath) {
    const oldPath = this._path;
    if (this._path.hasSameName(newPath)) {
      throw new Error('Cannot rename a folder to the same name');
    }
    this._path = this._path.updateName(newPath.name());
    this._updatedAt = FolderUpdatedAt.now();

    this.record(
      new FolderRenamedDomainEvent({
        aggregateId: this.uuid,
        previousPath: oldPath.name(),
        nextPath: this._path.name(),
      }),
    );
  }

  trash() {
    if (!this._status.is(FolderStatuses.EXISTS)) {
      throw new FolderAlreadyTrashed(this.name);
    }

    this._status = this._status.changeTo(FolderStatuses.TRASHED);
    this._updatedAt = FolderUpdatedAt.now();
  }

  isIn(folder: Folder): boolean {
    return this.parentUuid === folder.uuid;
  }

  isFolder(): this is Folder {
    return true;
  }

  isFile(): this is File {
    return false;
  }

  isRoot(): boolean {
    return !this._parentUuid;
  }

  hasStatus(status: FolderStatuses): boolean {
    return this._status.value === status;
  }

  attributes(): FolderAttributes {
    return {
      uuid: this.uuid,
      parentUuid: this.parentUuid ?? undefined,
      path: this.path,
      updatedAt: this.updatedAt.toISOString(),
      createdAt: this.createdAt.toISOString(),
      status: this.status,
    };
  }
}
