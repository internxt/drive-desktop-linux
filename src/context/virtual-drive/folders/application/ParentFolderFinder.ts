import { Service } from 'diod';
import { Path } from '../../../shared/domain/value-objects/Path';
import { FolderNotFoundError } from '../domain/errors/FolderNotFoundError';
import { Folder } from '../domain/Folder';
import { FolderRepository } from '../domain/FolderRepository';
import { DriveItemStatus } from '@internxt/drive-desktop-core/build/backend';

@Service()
export class ParentFolderFinder {
  constructor(private readonly repository: FolderRepository) {}

  async run(path: Path): Promise<Folder> {
    const result = this.repository.matchingPartial({
      path: path.dirname(),
      status: DriveItemStatus.EXISTS,
    });

    if (!result || result.length === 0) {
      throw new FolderNotFoundError(path.dirname());
    }

    if (result.length > 1) {
      throw new Error('A file can only have a parent');
    }

    return result[0];
  }
}
