import Logger from 'electron-log';
import { VirtualDrive } from '../../VirtualDrive';
import { FuseCallback } from './FuseCallback';
import { FuseIOError, FuseNoSuchFileOrDirectoryError } from './FuseErrors';

export class OpenCallback extends FuseCallback<number> {
  constructor(private readonly virtualDrive: VirtualDrive) {
    super('Open');
  }

  async execute(path: string, _flags: Array<any>) {
    try {
      const locallyAvailableResult = await this.virtualDrive.isLocallyAvailable(
        path
      );

      const locallyAvailable =
        locallyAvailableResult.isRight() && locallyAvailableResult.getRight();

      if (locallyAvailable) {
        return this.right(0);
      }

      const temporalFileExists = await this.virtualDrive.temporalFileExists(
        path
      );

      if (temporalFileExists.isRight() && temporalFileExists.getRight()) {
        return this.right(0);
      }

      const result = await this.virtualDrive.makeFileLocallyAvailable(path);

      if (result.isLeft()) {
        return this.left(new FuseNoSuchFileOrDirectoryError(path));
      }

      return this.right(0);
    } catch (err: unknown) {
      Logger.error('Error downloading file: ', err);
      if (err instanceof Error) {
        return this.left(new FuseIOError());
      }
      return this.left(new FuseIOError());
    }
  }
}