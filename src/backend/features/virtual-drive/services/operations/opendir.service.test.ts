import { mockDeep } from 'vitest-mock-extended';
import { Container } from 'diod';
import { opendir } from './opendir.service';
import { TemporalFileByFolderFinder } from '../../../../../context/storage/TemporalFiles/application/find/TemporalFileByFolderFinder';
import { FuseCodes } from '../../../../../apps/drive/fuse/callbacks/FuseCodes';
import { FILE_MODE, FOLDER_MODE } from '../../constants';
import type { TemporalFile } from '../../../../../context/storage/TemporalFiles/domain/TemporalFile';
import { LazyVirtualDriveHydrator } from '../lazy/LazyVirtualDriveHydrator';
import { FuseError } from '../../../../../apps/drive/fuse/callbacks/FuseErrors';

describe('opendir', () => {
  let container: ReturnType<typeof mockDeep<Container>>;
  const hydrator = mockDeep<LazyVirtualDriveHydrator>();
  const temporalFinder = mockDeep<TemporalFileByFolderFinder>();

  beforeEach(() => {
    container = mockDeep<Container>();
    container.get.calledWith(LazyVirtualDriveHydrator).mockReturnValue(hydrator);
    container.get.calledWith(TemporalFileByFolderFinder).mockReturnValue(temporalFinder);
    hydrator.readDirectory.mockResolvedValue({ files: [], folders: [] });
    temporalFinder.run.mockResolvedValue([]);
  });

  describe('when directory has files and subfolders', () => {
    it('should return entries with correct modes', async () => {
      hydrator.readDirectory.mockResolvedValue({ files: ['file.txt', 'photo.jpg'], folders: ['subdir'] });

      const { data, error } = await opendir('/some/folder', container);

      expect(error).toBeUndefined();
      expect(data?.entries).toStrictEqual([
        { name: 'subdir', mode: FOLDER_MODE },
        { name: 'file.txt', mode: FILE_MODE },
        { name: 'photo.jpg', mode: FILE_MODE },
      ]);
    });
  });

  describe('when directory has auxiliary temporal files', () => {
    it('should include only auxiliary temporal files in entries', async () => {
      const auxiliaryFile = mockDeep<TemporalFile>();
      auxiliaryFile.isAuxiliary.mockReturnValue(true);
      (auxiliaryFile as { name: string }).name = 'aux.tmp';

      const nonAuxiliaryFile = mockDeep<TemporalFile>();
      nonAuxiliaryFile.isAuxiliary.mockReturnValue(false);

      temporalFinder.run.mockResolvedValue([auxiliaryFile, nonAuxiliaryFile]);

      const { data, error } = await opendir('/some/folder', container);

      expect(error).toBeUndefined();
      expect(data?.entries).toStrictEqual([{ name: 'aux.tmp', mode: FILE_MODE }]);
    });
  });

  describe('when an unexpected error is thrown', () => {
    it('should return EIO', async () => {
      hydrator.readDirectory.mockRejectedValue(new FuseError(FuseCodes.EIO, 'unexpected'));

      const { data, error } = await opendir('/some/folder', container);

      expect(data).toBeUndefined();
      expect(error?.code).toBe(FuseCodes.EIO);
    });
  });
});
