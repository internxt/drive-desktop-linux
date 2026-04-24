import { FuseCodes } from '../../../../apps/drive/fuse/callbacks/FuseCodes';
import { FuseError } from '../../../../apps/drive/fuse/callbacks/FuseErrors';

const STATUS: Partial<Record<string, number>> = {
  [FuseCodes.ENOENT]: 404,
  [FuseCodes.EEXIST]: 409,
};

export function fuseErrorToStatus(error: FuseError): number {
  return STATUS[error.code] ?? 500;
}
