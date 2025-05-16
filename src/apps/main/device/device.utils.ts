import { driveServerModule } from '../../../infra/drive-server/drive-server.module';

export async function ensureBackupListHasUuids(
  backupList: Record<string, { enabled: boolean; folderId: number; folderUuid?: string }>
): Promise<Record<string, { enabled: boolean; folderId: number; folderUuid: string }>> {
  const updatedList: Record<string, { enabled: boolean; folderId: number; folderUuid: string }> = {};

  for (const [pathname, entry] of Object.entries(backupList)) {

    if (typeof entry.folderUuid === 'string' && entry.folderUuid.trim() !== '') {
      updatedList[pathname] = {
        enabled: entry.enabled,
        folderId: entry.folderId,
        folderUuid: entry.folderUuid,
      };
      continue;
    }

    try {
      const response = await driveServerModule.folders.getFolderMetadata(entry.folderId.toString());

      if (response.isRight()) {
        const folder = response.getRight();
        updatedList[pathname] = {
          enabled: entry.enabled,
          folderId: entry.folderId,
          folderUuid: folder.uuid,
        };
      } else {
        updatedList[pathname] = {
          enabled: entry.enabled,
          folderId: entry.folderId,
          folderUuid: '',
        };
      }
    } catch {
      updatedList[pathname] = {
        enabled: entry.enabled,
        folderId: entry.folderId,
        folderUuid: '',
      };
    }
  }

  return updatedList;
}



export function needsBackupListMigration(
  backupList: Record<string, { enabled: boolean; folderId: number; folderUuid?: string }>
): boolean {
  return Object.values(backupList).some(
    entry => typeof entry.folderUuid !== 'string' || entry.folderUuid.trim() === ''
  );
}
