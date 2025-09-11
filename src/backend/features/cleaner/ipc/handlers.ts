import { ipcMain } from 'electron';
import { CleanerReport } from '../cleaner.types';
import { generateCleanerReport } from '../generate-cleaner-report';

ipcMain.handle('cleaner:generate-report', async (_, force = false): Promise<CleanerReport> => {
  return await generateCleanerReport(force);
});
