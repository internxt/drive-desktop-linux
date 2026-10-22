import { FileCreator } from '../application/create/FileCreator';
import { PendingModificationTimes } from '../application/utimens/PendingModificationTimes';
import { File } from '../domain/File';
import { FileRepository } from '../domain/FileRepository';
import { SyncFileMessenger } from '../domain/SyncFileMessenger';
import { RemoteFileSystem } from '../domain/file-systems/RemoteFileSystem';
import { ParentFolderFinder } from '../../folders/application/ParentFolderFinder';
import { EventBus } from '../../shared/domain/EventBus';

export class FileCreatorTestClass extends FileCreator {
  public readonly mock = vi.fn();

  constructor() {
    super(
      {} as unknown as RemoteFileSystem,
      {} as unknown as FileRepository,
      {} as unknown as ParentFolderFinder,
      {} as unknown as EventBus,
      {} as unknown as SyncFileMessenger,
      {} as unknown as PendingModificationTimes,
    );
  }

  run(path: string, contentsId: string, size: number): Promise<File> {
    return this.mock(path, contentsId, size);
  }
}
