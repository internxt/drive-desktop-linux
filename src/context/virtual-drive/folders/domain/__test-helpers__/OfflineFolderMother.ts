import { FolderStatuses } from '../FolderStatus';
import { FolderUuid } from '../FolderUuid';
import { OfflineFolder, OfflineFolderAttributes } from '../OfflineFolder';
import { UuidMother } from '../../../../shared/domain/__test-helpers__/UuidMother';

import Chance from 'chance';
const chance = new Chance();

export class OfflineFolderMother {
  static random(): OfflineFolder {
    return OfflineFolder.from({
      uuid: FolderUuid.random().value,
      parentUuid: UuidMother.primitive(),
      path: `/${chance.name()}`,
      updatedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      status: FolderStatuses.EXISTS,
    });
  }

  static fromPartial(partial: Partial<OfflineFolderAttributes>): OfflineFolder {
    const random = OfflineFolderMother.random();
    return OfflineFolder.from({
      ...random.attributes(),
      ...partial,
    });
  }
}
