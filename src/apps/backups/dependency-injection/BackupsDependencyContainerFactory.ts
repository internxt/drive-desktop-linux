import { Container } from 'diod';
import { backgroundProcessSharedInfraBuilder } from '../../shared/dependency-injection/background/backgroundProcessSharedInfraBuilder';
import { registerFilesServices } from './virtual-drive/registerFilesServices';
import { registerFolderServices } from './virtual-drive/registerFolderServices';
import { registerLocalFileServices } from './local/registerLocalFileServices';

export class BackupsDependencyContainerFactory {
  static async build(): Promise<Container> {
    const builder = await backgroundProcessSharedInfraBuilder();

    await registerFilesServices(builder);
    registerFolderServices(builder);
    registerLocalFileServices(builder);

    const container = builder.build();

    return container;
  }
}
