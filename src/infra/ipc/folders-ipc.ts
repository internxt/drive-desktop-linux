import { FolderDto } from '../drive-server/out/dto';
import { Result } from '../../context/shared/domain/Result';

const isMainProcess = process.type === 'browser';

/**
 * Moves a folder to a different parent folder via IPC or direct call based on process type
 * @param uuid - The UUID of the folder to move
 * @param destinationFolderUuid - The UUID of the destination folder
 * @returns Promise resolving to the operation result
 */
export async function moveFolderIPC(uuid: string, destinationFolderUuid: string): Promise<Result<FolderDto, Error>> {
  if (isMainProcess) {
    const { moveFolder } = await import('../drive-server/services/folder/services/move-folder');
    return await moveFolder(uuid, destinationFolderUuid);
  } else {
    const { ipcRenderer } = await import('electron');
    return await ipcRenderer.invoke('move-folder', uuid, destinationFolderUuid);
  }
}

/**
 * Renames a folder via IPC or direct call based on process type
 * @param folderUuid - The UUID of the folder to rename
 * @param newFolderName - The new name for the folder
 * @returns Promise resolving to the updated folder data
 */
export async function renameFolderIPC(folderUuid: string, newFolderName: string): Promise<Result<FolderDto, Error>> {
  if (isMainProcess) {
    const { renameFolder } = await import('../drive-server/services/folder/services/rename-folder');
    return await renameFolder(folderUuid, newFolderName);
  } else {
    const { ipcRenderer } = await import('electron');
    return await ipcRenderer.invoke('rename-folder', folderUuid, newFolderName);
  }
}
