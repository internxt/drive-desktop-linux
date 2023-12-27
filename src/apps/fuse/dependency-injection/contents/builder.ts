import { Environment } from '@internxt/inxt-js';
import { DownloadContentsToPlainFile } from '../../../../context/virtual-drive/contents/application/DownloadContentsToPlainFile';
import { ContentsContainer } from './ContentsContainer';
import { DependencyInjectionUserProvider } from '../common/user';
import { DependencyInjectionMnemonicProvider } from '../common/mnemonic';
import { EnvironmentRemoteFileContentsManagersFactory } from '../../../../context/virtual-drive/contents/infrastructure/EnvironmentRemoteFileContentsManagersFactory';
import { FSLocalFileSystem } from '../../../../context/virtual-drive/contents/infrastructure/FSLocalFileSystem';
import { DependencyInjectionEventBus } from '../common/eventBus';
import { FuseAppDataLocalFileContentsDirectoryProvider } from '../../../../context/virtual-drive/shared/infrastructure/LocalFileContentsDirectoryProviders/FuseAppDataLocalFileContentsDirectoryProvider';
import { LocalContentChecker } from '../../../../context/virtual-drive/contents/application/LocalContentChecker';
import { RetryContentsUploader } from '../../../../context/virtual-drive/contents/application/RetryContentsUploader';
import { ContentsUploader } from '../../../../context/virtual-drive/contents/application/ContentsUploader';
import { FSLocalFileProvider } from '../../../../context/virtual-drive/contents/infrastructure/FSLocalFileProvider';
import { SharedContainer } from '../shared/SharedContainer';

export async function buildContentsContainer(
  sharedContainer: SharedContainer
): Promise<ContentsContainer> {
  const user = DependencyInjectionUserProvider.get();
  const mnemonic = DependencyInjectionMnemonicProvider.get();
  const { bus: eventBus } = DependencyInjectionEventBus;

  const environment = new Environment({
    bridgeUrl: process.env.BRIDGE_URL,
    bridgeUser: user.bridgeUser,
    bridgePass: user.userId,
    encryptionKey: mnemonic,
  });

  const contentsManagerFactory =
    new EnvironmentRemoteFileContentsManagersFactory(environment, user.bucket);

  const localFileContentsDirectoryProvider =
    new FuseAppDataLocalFileContentsDirectoryProvider();

  const localFS = new FSLocalFileSystem(
    localFileContentsDirectoryProvider,
    'downloaded'
  );

  const downloadContentsToPlainFile = new DownloadContentsToPlainFile(
    contentsManagerFactory,
    localFS,
    eventBus
  );

  const localContentChecker = new LocalContentChecker(localFS);

  const contentsUploader = new ContentsUploader(
    contentsManagerFactory,
    new FSLocalFileProvider(),
    sharedContainer.relativePathToAbsoluteConverter
  );

  const retryContentsUploader = new RetryContentsUploader(contentsUploader);

  return {
    downloadContentsToPlainFile,
    localContentChecker,
    retryContentsUploader,
  };
}
