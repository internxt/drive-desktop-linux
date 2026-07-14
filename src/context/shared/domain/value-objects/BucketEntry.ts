import { ABSOLUTE_UPLOAD_FILE_SIZE_LIMIT } from '../../../../backend/features/user/file-size-limit/constants';
import { ValueObject } from './ValueObject';

export class BucketEntry extends ValueObject<number> {
  static readonly MAX_SIZE = ABSOLUTE_UPLOAD_FILE_SIZE_LIMIT;

  constructor(value: number) {
    super(value);
    this.ensureIsValid(value);
  }

  private ensureIsValid(value: number) {
    if (value > BucketEntry.MAX_SIZE) {
      throw new Error('File size to big');
    }

    if (value < 0) {
      throw new Error('File size cannot be negative');
    }

    // if (value === 0) {
    //   throw new Error('File size cannot be zero');
    // }
  }
}
