import { DiffFilesCalculator } from './diff/DiffFilesCalculator';
import { BackupsIPC } from './BackupsIPC';
import { BackupsDependencyContainerFactory } from './dependency-injection/BackupsDependencyContainerFactory';
import { AbsolutePath } from '../../context/local/localFile/infrastructure/AbsolutePath';
import { AddedFilesBatchCreator } from './batches/AddedFilesBatchCreator';
import { GroupFilesBySize } from './batches/GroupFilesBySize';

async function backupFolder() {
  const data = await BackupsIPC.invoke('BACKUPS:GET_BACKUPS');

  const container = await BackupsDependencyContainerFactory.build();

  const { added, modified, deleted } = await container
    .get(DiffFilesCalculator)
    .run(data.path as AbsolutePath);

  const uploadFiles = container.get(AddedFilesBatchCreator);

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
