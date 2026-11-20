import { BackupInfo } from '../../../apps/backups/BackupInfo';
import { DiffFilesCalculatorService } from '../../../apps/backups/diff/DiffFilesCalculatorService';
import { FoldersDiffCalculator } from '../../../apps/backups/diff/FoldersDiffCalculator';
import { Result } from '../../../context/shared/domain/Result';
import { RemoteTreeBuilder } from '../../../context/virtual-drive/remoteTree/application/RemoteTreeBuilder';
import { buildLocalTree } from './local-tree';

export async function precalculateBackupItemCount(
  backupInfo: BackupInfo,
  remoteTreeBuilder: RemoteTreeBuilder,
): Promise<Result<number>> {
  let localTreeEither;
  try {
    localTreeEither = await buildLocalTree(backupInfo.pathname);
  } catch (error) {
    return { error: error instanceof Error ? error : new Error(String(error)) };
  }

  if (localTreeEither.error) {
    return { error: new Error('Error building local tree during precalculation') };
  }

  const local = localTreeEither.data;

  let remote;
  try {
    // v.2.7.1
    // Esteban Galvis Triana
    // Item counts use the SQLite tree. Refreshing here would sync the whole drive before the backup starts.
    remote = await remoteTreeBuilder.run(backupInfo.folderUuid);
  } catch (error) {
    return { error: error instanceof Error ? error : new Error(String(error)) };
  }

  const filesDiff = DiffFilesCalculatorService.calculate(local.tree, remote);
  const foldersDiff = FoldersDiffCalculator.calculate(local.tree, remote);

  return { data: filesDiff.total + foldersDiff.total };
}
