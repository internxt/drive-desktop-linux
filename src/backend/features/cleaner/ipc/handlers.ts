import { ipcMain } from 'electron';
import { CleanerReport } from '../cleaner.types';
import { generateCleanerReport } from '../generate-cleaner-report';

ipcMain.handle('cleaner:generate-report', async (): Promise<CleanerReport> => {
  return await generateCleanerReport();
});
