import { DriveItemStatus } from '../../../shared/domain/DriveItemStatus';
import { EnumValueObject } from '../../../shared/domain/value-objects/EnumValueObject';
import { InvalidArgumentError } from '../../../shared/domain/errors/InvalidArgumentError';
import { ActionNotPermittedError } from './errors/ActionNotPermittedError';

export { DriveItemStatus as FileStatuses } from '../../../shared/domain/DriveItemStatus';

export class FileStatus extends EnumValueObject<DriveItemStatus> {
  constructor(value: DriveItemStatus) {
    super(value, Object.values(DriveItemStatus));
  }

  static fromValue(value: string): FileStatus {
    for (const fileStatusValue of Object.values(DriveItemStatus)) {
      if (value === fileStatusValue.toString()) {
        return new FileStatus(fileStatusValue);
      }
    }

    throw new InvalidArgumentError(`The file status ${value} is invalid`);
  }

  static Exists = new FileStatus(DriveItemStatus.EXISTS);
  static Trashed = new FileStatus(DriveItemStatus.TRASHED);
  static Deleted = new FileStatus(DriveItemStatus.DELETED);

  changeTo(status: DriveItemStatus): FileStatus {
    if (this.value === 'TRASHED') {
      throw new ActionNotPermittedError('restore from trash');
    }

    if (this.value === 'DELETED') {
      throw new ActionNotPermittedError('restore, file is deleted');
    }

    return new FileStatus(status);
  }

  is(status: DriveItemStatus): boolean {
    return this.value === status;
  }

  protected throwErrorForInvalidValue(value: DriveItemStatus): void {
    throw new InvalidArgumentError(`File status ${value} is invalid`);
  }
}
