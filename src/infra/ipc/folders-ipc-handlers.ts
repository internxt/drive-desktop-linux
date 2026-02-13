import { ipcMain } from 'electron';
import { moveFolder } from '../drive-server/services/folder/services/move-folder';
import { renameFolder } from '../drive-server/services/folder/services/rename-folder';

ipcMain.handle('move-folder', async (_, uuid: string, destinationFolderUuid: string) => {
  return await moveFolder(uuid, destinationFolderUuid);
});

ipcMain.handle('rename-folder', async (_, folderUuid: string, newFolderName: string) => {
  return await renameFolder(folderUuid, newFolderName);
});
