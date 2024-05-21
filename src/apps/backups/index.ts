import { DiffFilesCalculator } from '../../context/backups/shared/application/DiffFilesCalculator';
import { BackupsIPC } from './BackupsIPC';
import { BackupsDependencyContainerFactory } from './dependency-injection/BackupsDependencyContainerFactory';
import { AbsolutePath } from '../../context/backups/localFile/infrastructure/AbsolutePath';
import { FileUploaderByChunks } from '../../context/backups/remoteFile/application/upload/FileUploaderByChunks';
import { GroupFilesBySize } from '../../context/backups/remoteFile/application/upload/GroupFilesBySize';

async function backupFolder() {
  const data = await BackupsIPC.invoke('BACKUPS:GET_BACKUPS');

  const container = await BackupsDependencyContainerFactory.build();

  const { added, modified, deleted } = await container
    .get(DiffFilesCalculator)
    .run(data.path as AbsolutePath);

  const uploadFiles = container.get(FileUploaderByChunks);

  await uploadFiles.run(
    GroupFilesBySize.small.run(added),
    NUMBER_OF_PARALLEL_QUEUES_FOR_SMALL_FILES
  );

  await uploadFiles.run(
    GroupFilesBySize.medium.run(added),
    NUMBER_OF_PARALLEL_QUEUES_FOR_MEDIUM_FILES
  );

  await uploadFiles.run(
    GroupFilesBySize.big.run(added),
    NUMBER_OF_PARALLEL_QUEUES_FOR_BIG_FILES
  );
}

backupFolder();
