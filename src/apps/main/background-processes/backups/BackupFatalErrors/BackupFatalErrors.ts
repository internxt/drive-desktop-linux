export type ProcessFatalErrorName =
  | 'NO_INTERNET'
  | 'NO_REMOTE_CONNECTION'
  | 'CANNOT_ACCESS_BASE_DIRECTORY'
  | 'BASE_DIRECTORY_DOES_NOT_EXIST'
  | 'INSUFFICIENT_PERMISSION_ACCESSING_BASE_DIRECTORY'
  | 'CANNOT_ACCESS_TMP_DIRECTORY'
  | 'CANNOT_GET_CURRENT_LISTINGS'
  | 'UNKNOWN';

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
