import { InvalidArgumentError } from './errors/InvalidArgumentError';

/** Lifecycle status shared by drive files and folders (API and local sync). */
export enum DriveItemStatus {
  EXISTS = 'EXISTS',
  TRASHED = 'TRASHED',
  DELETED = 'DELETED',
}

const driveItemStatusValues = new Set<string>(Object.values(DriveItemStatus));

export function isDriveItemStatus(value: string): value is DriveItemStatus {
  return driveItemStatusValues.has(value);
}

export function toDriveItemStatus(value: string): DriveItemStatus {
  if (!isDriveItemStatus(value)) {
    throw new InvalidArgumentError(`Invalid drive item status: ${value}`);
  }

  return value;
}
