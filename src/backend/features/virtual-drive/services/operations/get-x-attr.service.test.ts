import { mockDeep } from 'vitest-mock-extended';
import { Container } from 'diod';
import { getXAttr } from './get-x-attr.service';
import { FuseCodes } from '../../../../../apps/drive/fuse/callbacks/FuseCodes';
import { AllFilesInFolderAreAvailableOffline } from '../../../../../context/storage/StorageFolders/application/offline/AllFilesInFolderAreAvailableOffline';
import { StorageFileIsAvailableOffline } from '../../../../../context/storage/StorageFiles/application/offline/StorageFileIsAvailableOffline';

describe('get-x-attr.service', () => {
  let container: ReturnType<typeof mockDeep<Container>>;
  const fileAvailability = mockDeep<StorageFileIsAvailableOffline>();
  const folderAvailability = mockDeep<AllFilesInFolderAreAvailableOffline>();

  beforeEach(() => {
    container = mockDeep<Container>();
    container.get.calledWith(StorageFileIsAvailableOffline).mockReturnValue(fileAvailability);
    container.get.calledWith(AllFilesInFolderAreAvailableOffline).mockReturnValue(folderAvailability);
    fileAvailability.run.mockResolvedValue(false);
    folderAvailability.run.mockResolvedValue(false);
  });

  it('should return ENOSYS for root path', async () => {
    const { data, error } = await getXAttr('/', 'SYNC_STATUS', container);

    expect(data).toBeUndefined();
    expect(error?.code).toBe(FuseCodes.ENOSYS);
  });

  it('should return on_local when path is available offline', async () => {
    fileAvailability.run.mockResolvedValue(true);

    const { data, error } = await getXAttr('/some/file.txt', 'SYNC_STATUS', container);

    expect(error).toBeUndefined();
    expect(data).toStrictEqual({ value: 'on_local' });
  });

  it('should return on_remote when path is not available offline', async () => {
    const { data, error } = await getXAttr('/some/file.txt', 'SYNC_STATUS', container);

    expect(error).toBeUndefined();
    expect(data).toStrictEqual({ value: 'on_remote' });
  });
});