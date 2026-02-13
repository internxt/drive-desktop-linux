import { ipcMain } from 'electron';
import { renameFolder } from '../drive-server/services/folder/services/rename-folder';

ipcMain.handle('rename-folder', async (_, folderUuid: string, newFolderName: string) => {
  return await renameFolder(folderUuid, newFolderName);
});
