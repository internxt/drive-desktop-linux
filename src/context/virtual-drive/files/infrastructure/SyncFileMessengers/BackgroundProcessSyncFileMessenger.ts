import { SyncEngineIpc } from '../../../../../apps/sync-engine/ipcRendererSyncEngine';
import { SyncMessenger } from '../../../../shared/domain/SyncMessenger';
import { SyncFileMessenger } from '../../domain/SyncFileMessenger';

export class BackgroundProcessSyncFileMessenger
  extends SyncMessenger
  implements SyncFileMessenger
{
  constructor(private readonly ipc: SyncEngineIpc) {
    super();
  }

  async created(name: string, extension: string): Promise<void> {
    this.ipc.send('FILE_CREATED', {
      name,
      extension,
      nameWithExtension: this.nameWithExtension(name, extension),
    });
  }

  async errorWhileCreating(
    name: string,
    extension: string,
    message: string
  ): Promise<void> {
    this.ipc.send('FILE_UPLOAD_ERROR', {
      name,
      extension,
      nameWithExtension: this.nameWithExtension(name, extension),
      error: message,
    });
  }

  async trashing(name: string, extension: string, size: number): Promise<void> {
    this.ipc.send('FILE_DELETING', {
      name,
      extension,
      nameWithExtension: this.nameWithExtension(name, extension),
      size,
    });
  }

  async trashed(name: string, extension: string, size: number): Promise<void> {
    this.ipc.send('FILE_DELETED', {
      name,
      extension,
      nameWithExtension: this.nameWithExtension(name, extension),
      size,
    });
  }

  async errorWhileTrashing(
    name: string,
    extension: string,
    message: string
  ): Promise<void> {
    this.ipc.send('FILE_DELETION_ERROR', {
      name,
      extension,
      nameWithExtension: this.nameWithExtension(name, extension),
      error: message,
    });
  }
}
