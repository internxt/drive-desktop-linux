import { Container } from 'diod';
import { Either, right } from '../../../context/shared/domain/Either';
import { TemporalFileByPathFinder } from '../../../context/storage/TemporalFiles/application/find/TemporalFileByPathFinder';
import { isLocallyAvailable } from '../../../context/virtual-drive/shared/application/path-local-availability-checker';
import { VirtualDriveError } from '../errors/VirtualDriveError';

export class VirtualDrive {
  constructor(private readonly container: Container) {}

  async isLocallyAvailable(path: string): Promise<boolean> {
    return isLocallyAvailable({ path, container: this.container });
  }

  async temporalFileExists(path: string): Promise<Either<VirtualDriveError, boolean>> {
    const file = await this.container.get(TemporalFileByPathFinder).run(path);

    if (!file) {
      return right(false);
    }

    return right(true);
  }
}
