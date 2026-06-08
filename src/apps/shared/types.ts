type ActionWithProgress = 'UPLOADING' | 'DOWNLOADING';

type DriveOperationWithProgress = {
  action: ActionWithProgress;
  progress: number;
  oldName: string;
  name: string;
};

type Action =
  | 'RENAMING'
  | 'DELETING'
  | 'UPLOADED'
  | 'DOWNLOADED'
  | 'RENAMED'
  | 'DELETED'
  | 'RENAMING_FOLDER'
  | 'CREATING_FOLDER'
  | 'FOLDER_RENAMED'
  | 'FOLDER_CREATED';

type DriveOperation = {
  action: Action;
  name: string;
  oldName: string | undefined;
  progress: undefined; // Needed so ts does not complain with the union type
};

export type DriveOperationInfo = DriveOperationWithProgress | DriveOperation;
