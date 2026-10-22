import { mockDeep } from 'vitest-mock-extended';
import { Container } from 'diod';
import { opendir } from './opendir.service';
import { TemporalFileByFolderFinder } from '../../../../../context/storage/TemporalFiles/application/find/TemporalFileByFolderFinder';
import { FuseCodes } from '../../../../../apps/drive/fuse/callbacks/FuseCodes';
import { FuseError } from '../../../../../apps/drive/fuse/callbacks/FuseErrors';
import { FILE_MODE, FOLDER_MODE } from '../../constants';
import * as metadataSynchronizer from '../lazy/metadata-synchronizer';
import { call, partialSpyOn } from 'tests/vitest/utils.helper';
import { FileRepository } from '../../../../../context/virtual-drive/files/domain/FileRepository';
import { FolderRepository } from '../../../../../context/virtual-drive/folders/domain/FolderRepository';
import type { TemporalFile } from '../../../../../context/storage/TemporalFiles/domain/TemporalFile';

describe('opendir', () => {
  let container: ReturnType<typeof mockDeep<Container>>;
  const temporalFinder = mockDeep<TemporalFileByFolderFinder>();
  const readDirectoryMock = partialSpyOn(metadataSynchronizer, 'readDirectory');
  const fileRepository = mockDeep<FileRepository>();
  const folderRepository = mockDeep<FolderRepository>();

  beforeEach(() => {
    container = mockDeep<Container>();
    container.get.calledWith(TemporalFileByFolderFinder).mockReturnValue(temporalFinder);
    container.get.calledWith(FileRepository).mockReturnValue(fileRepository);
    container.get.calledWith(FolderRepository).mockReturnValue(folderRepository);
    temporalFinder.run.mockResolvedValue([]);
    readDirectoryMock.mockResolvedValue({ data: { files: [], folders: [] } });
  });

  describe('when directory has files and subfolders', () => {
    it('should return entries with correct modes', async () => {
      readDirectoryMock.mockResolvedValue({
        data: {
          files: ['file.txt', 'photo.jpg'],
          folders: ['subdir'],
        },
      });

      const { data, error } = await opendir('/some/folder', container);

      expect(error).toBeUndefined();
      call(readDirectoryMock).toStrictEqual({ path: '/some/folder', folderRepository, fileRepository });
      expect(data?.entries).toStrictEqual([
        { name: 'file.txt', mode: FILE_MODE },
        { name: 'photo.jpg', mode: FILE_MODE },
        { name: 'subdir', mode: FOLDER_MODE },
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

  describe('when the directory does not exist remotely', () => {
    it('should return ENOENT', async () => {
      readDirectoryMock.mockResolvedValue({ error: new FuseError(FuseCodes.ENOENT, 'not found') });

      const { data, error } = await opendir('/unsynced/folder', container);

      expect(data).toBeUndefined();
      expect(error?.code).toBe(FuseCodes.ENOENT);
    });
  });

  describe('when an unexpected error is thrown', () => {
    it('should return EIO', async () => {
      readDirectoryMock.mockRejectedValue(new Error('unexpected'));

      const { data, error } = await opendir('/some/folder', container);

      expect(data).toBeUndefined();
      expect(error?.code).toBe(FuseCodes.EIO);
    });
  });
});
