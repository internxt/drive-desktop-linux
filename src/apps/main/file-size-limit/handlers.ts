import { ipcMain } from 'electron';
import { FileSizeLimitModule } from '@internxt/drive-desktop-core/build/backend';

import { getFileSizeLimitAdapter } from '../../../backend/features/user/file-size-limit/get-file-size-limit-adapter';

function watchFileSizeLimitAfterUpgrade() {
  FileSizeLimitModule.watchFileSizeLimitAfterUpgrade(getFileSizeLimitAdapter());
}

ipcMain.handle('watchFileSizeLimitAfterUpgrade', watchFileSizeLimitAfterUpgrade);
