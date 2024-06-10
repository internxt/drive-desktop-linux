import { Service } from 'diod';
import { BackupsIPCRenderer } from '../../../../apps/backups/BackupsIPCRenderer';
import { SyncErrorCause } from '../../../../shared/issues/SyncErrorCause';
import { LocalFile } from '../domain/LocalFile';
import { LocalFileMessenger } from '../domain/LocalFileMessenger';

@Service()
export class RendererIpcLocalFileMessenger implements LocalFileMessenger {
  async creationFailed(file: LocalFile, issue: SyncErrorCause): Promise<void> {
    BackupsIPCRenderer.send(
      'backups.file-issue',
      file.nameWithExtension(),
      issue
    );
  }
}
