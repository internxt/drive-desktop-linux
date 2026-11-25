import { AntivirusScanService } from '../../../apps/main/antivirus/AntivirusScanService';
import { getAntivirusManager } from '../../../apps/main/antivirus/antivirusManager';
import { tryCatch } from '../../../shared/try-catch';
import { logger } from '@internxt/drive-desktop-core/build/backend';

export function stopAntivirus() {
  return tryCatch(
    async () => {
      await AntivirusScanService.cancelScan();
      await getAntivirusManager().shutdown();
    },
    (error) => logger.error({ msg: '[APP] Failed to run cleanup step on quit', step: 'stop-antivirus', error }),
  );
}
