import { logger } from '@internxt/drive-desktop-core/build/backend';
import { BackupInfo } from '../../../apps/backups/BackupInfo';
import { DiffFilesCalculatorService } from '../../../apps/backups/diff/DiffFilesCalculatorService';
import { FoldersDiffCalculator } from '../../../apps/backups/diff/FoldersDiffCalculator';
import { AbsolutePath } from '../../../context/local/localFile/infrastructure/AbsolutePath';
import LocalTreeBuilder from '../../../context/local/localTree/application/LocalTreeBuilder';
import { RemoteTreeBuilder } from '../../../context/virtual-drive/remoteTree/application/RemoteTreeBuilder';
import { Container } from 'diod';

export const precalculateBackupItemCount = async (backupInfo: BackupInfo, container: Container) => {
  try {
    const localTreeBuilder = container.get(LocalTreeBuilder);
    const remoteTreeBuilder = container.get(RemoteTreeBuilder);

    const localTreeEither = await localTreeBuilder.run(backupInfo.pathname as AbsolutePath);

    if (localTreeEither.isLeft()) {
      logger.error({
        tag: 'BACKUPS',
        msg: 'Error building local tree during precalculation',
        pathname: backupInfo.pathname,
      });
      return 0;
    }

    const local = localTreeEither.getRight();
    const remote = await remoteTreeBuilder.run(backupInfo.folderId, backupInfo.folderUuid);

    const filesDiff = DiffFilesCalculatorService.calculate(local, remote);
    const foldersDiff = FoldersDiffCalculator.calculate(local, remote);

    const totalItems = filesDiff.total + foldersDiff.total;

    logger.debug({
      tag: 'BACKUPS',
      msg: 'Backup item count precalculated',
      pathname: backupInfo.pathname,
      count: totalItems,
    });

    return totalItems;
  } catch (error) {
    logger.error({
      tag: 'BACKUPS',
      msg: 'Error during backup item precalculation',
      pathname: backupInfo.pathname,
      error,
    });
    return 0;
  }
};
