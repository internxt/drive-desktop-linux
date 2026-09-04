import { mockDeep } from 'vitest-mock-extended';
import { Container } from 'diod';
import { FuseCodes } from '../../../../../apps/drive/fuse/callbacks/FuseCodes';
import { FirstsFileSearcher } from '../../../../../context/virtual-drive/files/application/search/FirstsFileSearcher';
import { PendingModificationTimes } from '../../../../../context/virtual-drive/files/application/utimens/PendingModificationTimes';
import { TemporalFileByPathFinder } from '../../../../../context/storage/TemporalFiles/application/find/TemporalFileByPathFinder';
import { SingleFolderMatchingSearcher } from '../../../../../context/virtual-drive/folders/application/SingleFolderMatchingSearcher';
import type { TemporalFile } from '../../../../../context/storage/TemporalFiles/domain/TemporalFile';
import type { File } from '../../../../../context/virtual-drive/files/domain/File';
import { utimens } from './utimens.service';

vi.mock('@internxt/drive-desktop-core/build/backend');

describe('utimens', () => {
  const REQUESTED = new Date('2024-03-04T05:06:07.000Z');

  let container: ReturnType<typeof mockDeep<Container>>;
  const firstsFileSearcher = mockDeep<FirstsFileSearcher>();
  const temporalFileFinder = mockDeep<TemporalFileByPathFinder>();
  const pendingModificationTimes = mockDeep<PendingModificationTimes>();
  const folderSearcher = mockDeep<SingleFolderMatchingSearcher>();

  beforeEach(() => {
    vi.clearAllMocks();
    container = mockDeep<Container>();
    container.get.calledWith(FirstsFileSearcher).mockReturnValue(firstsFileSearcher);
    container.get.calledWith(TemporalFileByPathFinder).mockReturnValue(temporalFileFinder);
    container.get.calledWith(PendingModificationTimes).mockReturnValue(pendingModificationTimes);
    container.get.calledWith(SingleFolderMatchingSearcher).mockReturnValue(folderSearcher);

    firstsFileSearcher.run.mockResolvedValue(undefined);
    temporalFileFinder.run.mockResolvedValue(undefined);
    folderSearcher.run.mockResolvedValue(undefined);
  });

  describe('when the file is still staged, which is what cp -p does', () => {
    beforeEach(() => {
      // cp -p calls utimensat on the open descriptor BEFORE close, so no drive
      // record exists yet, only a temporal file.
      temporalFileFinder.run.mockResolvedValue({} as unknown as TemporalFile);
    });

    it('should succeed rather than returning ENOENT', async () => {
      const { data, error } = await utimens({ path: '/some/file.txt', modificationTime: REQUESTED, container });

      expect(error).toBeUndefined();
      expect(data).toBeUndefined();
    });

    it('should hold the time for the upload to carry', async () => {
      await utimens({ path: '/some/file.txt', modificationTime: REQUESTED, container });

      expect(pendingModificationTimes.set).toHaveBeenCalledWith('/some/file.txt', REQUESTED);
    });
  });

  it('should refuse a file that already exists on the drive rather than lying about it', async () => {
    // The only endpoint that carries a time for an uploaded file re-declares its
    // contents id, which is unsafe. Writing the time locally instead would look
    // like success and be undone by the next remote listing.
    firstsFileSearcher.run.mockResolvedValue({ uuid: 'a-uuid' } as unknown as File);

    const { error } = await utimens({ path: '/some/file.txt', modificationTime: REQUESTED, container });

    expect(error?.code).toBe(FuseCodes.ENOSYS);
    expect(pendingModificationTimes.set).not.toHaveBeenCalled();
  });

  it('should prefer refusing over staging when the file exists on the drive AND is staged', async () => {
    // An overwrite in progress. The upload will take the override path, which
    // does not carry a modification time, so a held time would never be applied
    // and would sit in the map until something else took it.
    firstsFileSearcher.run.mockResolvedValue({ uuid: 'a-uuid' } as unknown as File);
    temporalFileFinder.run.mockResolvedValue({} as unknown as TemporalFile);

    const { error } = await utimens({ path: '/some/file.txt', modificationTime: REQUESTED, container });

    expect(error?.code).toBe(FuseCodes.ENOSYS);
    expect(pendingModificationTimes.set).not.toHaveBeenCalled();
  });

  it('should refuse a directory rather than claiming it does not exist', async () => {
    // cp -a and tar -x set directory times. ENOENT would send the caller after
    // the wrong problem for something that is plainly there.
    folderSearcher.run.mockResolvedValue({ uuid: 'a-folder-uuid' } as never);

    const { error } = await utimens({ path: '/some/folder', modificationTime: REQUESTED, container });

    expect(error?.code).toBe(FuseCodes.ENOSYS);
    expect(pendingModificationTimes.set).not.toHaveBeenCalled();
  });

  it('should return ENOENT when the path is neither on the drive nor staged', async () => {
    const { error } = await utimens({ path: '/nope.txt', modificationTime: REQUESTED, container });

    expect(error?.code).toBe(FuseCodes.ENOENT);
    expect(pendingModificationTimes.set).not.toHaveBeenCalled();
  });
});
