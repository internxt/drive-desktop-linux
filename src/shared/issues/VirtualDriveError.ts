export type VirtualDriveFileError =
  | 'UPLOAD_ERROR'
  | 'DOWNLOAD_ERROR'
  | 'RENAME_ERROR'
  | 'DELETE_ERROR'
  | 'METADATA_READ_ERROR'
  | 'GENERATE_TREE';

export type VirtualDriveFolderError = 'FOLDER_RENAME_ERROR' | 'FOLDER_CREATE_ERROR' | 'FOLDER_TRASH_ERROR';
export type VirtualDriveError = VirtualDriveFileError | VirtualDriveFolderError;
