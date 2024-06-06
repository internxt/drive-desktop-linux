import { SyncErrorCause } from '../../../../../shared/issues/SyncErrorCause';

export type ProcessFatalErrorName = SyncErrorCause;

export type BackupFatalError = {
  path: string;
  folderId: number;
  errorName: ProcessFatalErrorName;
};

export class BackupFatalErrors {
  private errors: Array<BackupFatalError> = [];

  constructor(
    private readonly onBackupFatalErrorsChanged: (
      errors: Array<BackupFatalError>
    ) => void
  ) {}

  clear() {
    this.errors = [];
    this.onBackupFatalErrorsChanged(this.errors);
  }

  add(errors: Array<BackupFatalError>) {
    this.errors = this.errors.concat(errors);
    this.onBackupFatalErrorsChanged(this.errors);
  }

  get(): Array<BackupFatalError> {
    return this.errors;
  }
}
