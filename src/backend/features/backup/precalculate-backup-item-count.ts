import { BackupInfo } from '../../../apps/backups/BackupInfo';
import { DiffFilesCalculatorService } from '../../../apps/backups/diff/DiffFilesCalculatorService';
import { FoldersDiffCalculator } from '../../../apps/backups/diff/FoldersDiffCalculator';
import LocalTreeBuilder from '../../../context/local/localTree/application/LocalTreeBuilder';
import { Result } from '../../../context/shared/domain/Result';
import { RemoteTreeBuilder } from '../../../context/virtual-drive/remoteTree/application/RemoteTreeBuilder';

export async function precalculateBackupItemCount(
  backupInfo: BackupInfo,
  localTreeBuilder: LocalTreeBuilder,
  remoteTreeBuilder: RemoteTreeBuilder,
): Promise<Result<number>> {
  let localTreeEither;
  try {
    localTreeEither = await localTreeBuilder.run(backupInfo.pathname);
  } catch (error) {
    return { error: error instanceof Error ? error : new Error(String(error)) };
  }

  if (localTreeEither.isLeft()) {
    return { error: new Error('Error building local tree during precalculation') };
  }

  const local = localTreeEither.getRight();

  let remote;
  try {
    remote = await remoteTreeBuilder.run(backupInfo.folderId, backupInfo.folderUuid, true);
  } catch (error) {
    return { error: error instanceof Error ? error : new Error(String(error)) };
  }

  const filesDiff = DiffFilesCalculatorService.calculate(local, remote);
  const foldersDiff = FoldersDiffCalculator.calculate(local, remote);

  return { data: filesDiff.total + foldersDiff.total };
}
