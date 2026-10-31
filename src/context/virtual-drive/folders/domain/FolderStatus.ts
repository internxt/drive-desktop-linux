import { DriveItemStatus } from '../../../shared/domain/DriveItemStatus';
import { EnumValueObject } from '../../../shared/domain/value-objects/EnumValueObject';
import { InvalidArgumentError } from '../../../shared/domain/errors/InvalidArgumentError';
import { ActionNotPermittedError } from './errors/ActionNotPermittedError';

export { DriveItemStatus as FolderStatuses } from '../../../shared/domain/DriveItemStatus';

export class FolderStatus extends EnumValueObject<DriveItemStatus> {
  constructor(value: DriveItemStatus) {
    super(value, Object.values(DriveItemStatus));
  }

  static fromValue(value: string): FolderStatus {
    for (const folderStatusValue of Object.values(DriveItemStatus)) {
      if (value === folderStatusValue.toString()) {
        return new FolderStatus(folderStatusValue);
      }
    }

    throw new InvalidArgumentError(`The folder status ${value} is invalid`);
  }

  static Exists = new FolderStatus(DriveItemStatus.EXISTS);
  static Trashed = new FolderStatus(DriveItemStatus.TRASHED);
  static Deleted = new FolderStatus(DriveItemStatus.DELETED);

  changeTo(status: DriveItemStatus): FolderStatus {
    if (this.value === 'TRASHED') {
      throw new ActionNotPermittedError('restore from trash');
    }

    return new FolderStatus(status);
  }

  is(status: DriveItemStatus): boolean {
    return this.value === status;
  }

  protected throwErrorForInvalidValue(value: DriveItemStatus): void {
    throw new InvalidArgumentError(`Folder status ${value} is invalid`);
  }
}
