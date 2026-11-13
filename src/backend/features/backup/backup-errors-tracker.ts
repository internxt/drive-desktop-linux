import { isFatalError } from '../../../shared/issues/SyncErrorCause';
import { broadcastToWindows } from '../../../apps/main/windows';
import { BackupErrorRecord } from './backup.types';

export class BackupErrorsTracker {
  private errors: Map<string, BackupErrorRecord> = new Map();

  clear() {
    this.errors = new Map();
    this.broadcast();
  }

  add(folderUuid: string, error: BackupErrorRecord) {
    this.errors.set(folderUuid, error);
    this.broadcast();
  }

  get(folderUuid: string): BackupErrorRecord | undefined {
    return this.errors.get(folderUuid);
  }

  getAll(): BackupErrorRecord[] {
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
