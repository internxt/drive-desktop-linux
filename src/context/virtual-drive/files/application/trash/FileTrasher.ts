import { Service } from 'diod';
import Logger from 'electron-log';
import { DriveDesktopError } from '../../../../shared/domain/errors/DriveDesktopError';
import { AllParentFoldersStatusIsExists } from '../../../folders/application/AllParentFoldersStatusIsExists';
import { File } from '../../domain/File';
import { FileRepository } from '../../domain/FileRepository';
import { FileStatuses } from '../../domain/FileStatus';
import { SyncFileMessenger } from '../../domain/SyncFileMessenger';
import { driveServerModule } from '../../../../../infra/drive-server/drive-server.module';

@Service()
export class FileTrasher {
  constructor(
    private readonly repository: FileRepository,
    private readonly allParentFoldersStatusIsExists: AllParentFoldersStatusIsExists,
    private readonly notifier: SyncFileMessenger
  ) {}

  async run(contentsId: File['contentsId']): Promise<void> {
    const file = this.repository
      .matchingPartial({
        contentsId,
        status: FileStatuses.EXISTS,
      })
      .at(0);

    if (!file) {
      return;
    }

    if (file.status.is(FileStatuses.TRASHED)) {
      Logger.warn(`File ${file.path} is already trashed. Will ignore...`);
      return;
    }

    const allParentsExists = await this.allParentFoldersStatusIsExists.run(
      file.folderId
    );

    if (!allParentsExists) {
      Logger.warn(
        `Skipped file deletion for ${file.path}. A folder in a higher level is already marked as trashed`
      );
      return;
    }
    await this.notifier.trashing(file.name, file.type, file.size);

    try {
      file.trash();

      await driveServerModule.files.addFileToTrash(({
        id: file.contentsId,
        uuid: file.uuid,
        type: 'file',
      }));
      await this.repository.update(file);
      await this.notifier.trashed(file.name, file.type, file.size);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';

      Logger.error('[File Deleter]', message);

      const cause =
        error instanceof DriveDesktopError ? error.cause : 'UNKNOWN';

      await this.notifier.issues({
        error: 'DELETE_ERROR',
        cause,
        name: file.nameWithExtension,
      });

      throw error;
    }
  }
}
