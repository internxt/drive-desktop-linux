import { Environment } from '@internxt/inxt-js';
import { DependencyInjectionMnemonicProvider } from '../common/mnemonic';
import { DependencyInjectionUserProvider } from '../common/user';
import { SharedContainer } from '../shared/SharedContainer';
import { ContentsContainer } from './ContentsContainer';
import { DependencyInjectionEventBus } from '../common/eventBus';
import { DependencyInjectionEventRepository } from '../common/eventRepository';
import { ContentsDownloader } from '../../../../context/virtual-drive/contents/application/ContentsDownloader';
import { ContentsUploader } from '../../../../context/virtual-drive/contents/application/ContentsUploader';
import { NotifyMainProcessHydrationFinished } from '../../../../context/virtual-drive/contents/application/NotifyMainProcessHydrationFinished';
import { RetryContentsUploader } from '../../../../context/virtual-drive/contents/application/RetryContentsUploader';
import { EnvironmentRemoteFileContentsManagersFactory } from '../../../../context/virtual-drive/contents/infrastructure/EnvironmentRemoteFileContentsManagersFactory';
import { FSLocalFileProvider } from '../../../../context/virtual-drive/contents/infrastructure/FSLocalFileProvider';
import { FSLocalFileWriter } from '../../../../context/virtual-drive/contents/infrastructure/FSLocalFileWriter';
import { ipcRendererSyncEngine } from '../../ipcRendererSyncEngine';
import { IPCLocalFileContentsDirectoryProvider } from '../../../../context/virtual-drive/contents/infrastructure/IPCLocalFileContentsDirectoryProvider';

export async function buildContentsContainer(
  sharedContainer: SharedContainer
): Promise<ContentsContainer> {
  const user = DependencyInjectionUserProvider.get();
  const mnemonic = DependencyInjectionMnemonicProvider.get();
  const { bus: eventBus } = DependencyInjectionEventBus;
  const eventRepository = DependencyInjectionEventRepository.get();

  const environment = new Environment({
    bridgeUrl: process.env.BRIDGE_URL,
    bridgeUser: user.bridgeUser,
    bridgePass: user.userId,
    encryptionKey: mnemonic,
  });

  const contentsManagerFactory =
    new EnvironmentRemoteFileContentsManagersFactory(environment, user.bucket);

  const contentsProvider = new FSLocalFileProvider();
  const contentsUploader = new ContentsUploader(
    contentsManagerFactory,
    contentsProvider,
    ipcRendererSyncEngine,
    sharedContainer.relativePathToAbsoluteConverter
  );

  const retryContentsUploader = new RetryContentsUploader(contentsUploader);

  const localFileContentsDirectoryProvider =
    new IPCLocalFileContentsDirectoryProvider();

  const localWriter = new FSLocalFileWriter(localFileContentsDirectoryProvider);

  const contentsDownloader = new ContentsDownloader(
    contentsManagerFactory,
    localWriter,
    ipcRendererSyncEngine,
    localFileContentsDirectoryProvider,
    eventBus
  );

  const notifyMainProcessHydrationFinished =
    new NotifyMainProcessHydrationFinished(
      eventRepository,
      ipcRendererSyncEngine
    );

  return {
    contentsUploader: retryContentsUploader,
    contentsDownloader,
    localFileContentsDirectoryProvider,
    notifyMainProcessHydrationFinished,
  };
}