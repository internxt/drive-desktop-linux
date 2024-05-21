import { Container, ContainerBuilder } from 'diod';
import { DiffFilesCalculator } from '../../../context/backups/shared/application/DiffFilesCalculator';
import { FileUploaderByChunks } from '../../../context/backups/remoteFile/application/upload/FileUploaderByChunks';
import CurrentLocalFilesProvider from '../../../context/backups/localFile/application/CurrentLocalFilesProvider';

export class BackupsDependencyContainerFactory {
  static async build(): Promise<Container> {
    const builder = new ContainerBuilder();

    builder.registerAndUse(CurrentLocalFilesProvider);
    builder.registerAndUse(DiffFilesCalculator);
    builder.registerAndUse(FileUploaderByChunks);

    const container = builder.build();

    return container;
  }
}
