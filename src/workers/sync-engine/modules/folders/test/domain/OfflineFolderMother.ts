import { FolderStatuses } from '../../domain/FolderStatus';
import { FolderUuid } from '../../domain/FolderUuid';
import {
  OfflineFolder,
  OfflineFolderAttributes,
} from '../../domain/OfflineFolder';

import Chance from 'chance';
const chance = new Chance();

export class OfflineFolderMother {
  static random(): OfflineFolder {
    return OfflineFolder.from({
      uuid: FolderUuid.random().value,
      parentId: chance.integer({ min: 1 }),
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
