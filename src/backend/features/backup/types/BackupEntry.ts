export type BackupEntry = {
  enabled: boolean;
  folderUuid: string;
};

/** @deprecated Persisted entries may still carry numeric folderId until migrated. */
export type StoredBackupEntry = BackupEntry & {
  folderId?: number;
};
