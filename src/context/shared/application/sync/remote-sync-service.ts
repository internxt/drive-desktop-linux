import { UpdatedRemoteItemsDto } from './remote-sync.contract';

export type RemoteSyncService = {
  getUpdatedRemoteItems: () => Promise<UpdatedRemoteItemsDto>;
  startRemoteSync: () => Promise<void>;
  resyncRemoteSync: () => Promise<void>;
};

let remoteSyncService: RemoteSyncService | undefined;

export function registerRemoteSyncService(service: RemoteSyncService) {
  remoteSyncService = service;
}

export function getRemoteSyncService() {
  if (!remoteSyncService) {
    throw new Error('Remote sync service has not been registered');
  }

  return remoteSyncService;
}
