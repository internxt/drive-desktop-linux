import { isFatalError, SyncError } from '../../../shared/issues/SyncErrorCause';
import { broadcastToWindows } from '../../../apps/main/windows';

export type BackupError = {
  name: string;
  error: SyncError;
};

export class BackupFatalErrors {
  private errors: Map<number, BackupError> = new Map();

  clear() {
    this.errors = new Map();
    this.broadcast();
  }

  add(folderId: number, error: BackupError) {
    this.errors.set(folderId, error);
    this.broadcast();
  }

  get(folderId: number): BackupError | undefined {
    return this.errors.get(folderId);
  }

  getAll(): BackupError[] {
    return Array.from(this.errors.values());
  }

  lastBackupHadFatalIssue(): boolean {
    const lastError = this.getAll().at(-1);
    return lastError !== undefined && isFatalError(lastError.error);
  }

  private broadcast() {
    broadcastToWindows('backup-fatal-errors-changed', this.getAll());
  }
}
