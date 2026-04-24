import { mockDeep } from 'vitest-mock-extended';
import { Container } from 'diod';
import { getAttributes } from './get-attributes.service';
import { FILE_MODE, FOLDER_MODE } from '../../constants';
import { FirstsFileSearcher } from '../../../../../context/virtual-drive/files/application/search/FirstsFileSearcher';
import { SingleFolderMatchingSearcher } from '../../../../../context/virtual-drive/folders/application/SingleFolderMatchingSearcher';
import { TemporalFileByPathFinder } from '../../../../../context/storage/TemporalFiles/application/find/TemporalFileByPathFinder';
import { FuseCodes } from '../../../../../apps/drive/fuse/callbacks/FuseCodes';
import { File } from '../../../../../context/virtual-drive/files/domain/File';
import { FileStatuses } from '../../../../../context/virtual-drive/files/domain/FileStatus';
import { Folder } from '../../../../../context/virtual-drive/folders/domain/Folder';
import { TemporalFile } from '../../../../../context/storage/TemporalFiles/domain/TemporalFile';

vi.mock('@internxt/drive-desktop-core/build/backend');

describe('getAttributes', () => {
  let now: Date;
  let container: ReturnType<typeof mockDeep<Container>>;
  const fileSearcher = mockDeep<FirstsFileSearcher>();
  const folderSearcher = mockDeep<SingleFolderMatchingSearcher>();
  const temporalFinder = mockDeep<TemporalFileByPathFinder>();

  beforeEach(() => {
    now = new Date();
    container = mockDeep<Container>();
    container.get.calledWith(FirstsFileSearcher).mockReturnValue(fileSearcher);
    fileSearcher.run.mockResolvedValue(undefined);
    folderSearcher.run.mockResolvedValue(undefined);
  });

  describe('when path is root', () => {
    it('should return folder attributes for "/"', async () => {
      const { data, error } = await getAttributes('/', container);

      expect(error).toBeUndefined();
      expect(data).toMatchObject({ mode: FOLDER_MODE, size: 0, nlink: 2 });
    });

    it('should return folder attributes for empty string', async () => {
      const { data, error } = await getAttributes('', container);

      expect(error).toBeUndefined();
      expect(data).toMatchObject({ mode: FOLDER_MODE, size: 0, nlink: 2 });
    });
  });

  describe('when a file is found', () => {
    it('should return file attributes', async () => {
      fileSearcher.run.mockResolvedValue(
        File.from({
          id: 1,
          uuid: '550e8400-e29b-41d4-a716-446655440001',
          contentsId: 'aabbccddeeff001122334455',
          folderId: 1,
          createdAt: now.toISOString(),
          modificationTime: now.toISOString(),
          path: '/some/file.txt',
          size: 4096,
          updatedAt: now.toISOString(),
          status: FileStatuses.EXISTS,
        }),
      );

      const { data, error } = await getAttributes('/some/file.txt', container);

      expect(error).toBeUndefined();
      expect(data).toMatchObject({ mode: FILE_MODE, size: 4096, nlink: 1 });
    });
  });

  describe('when a folder is found', () => {
    it('should return folder attributes', async () => {
      folderSearcher.run.mockResolvedValue(
        Folder.from({
          id: 1,
          uuid: '550e8400-e29b-41d4-a716-446655440002',
          parentId: null,
          path: '/some/folder',
          createdAt: now.toISOString(),
          updatedAt: now.toISOString(),
          status: 'EXISTS',
        }),
      );
      container.get.calledWith(SingleFolderMatchingSearcher).mockReturnValue(folderSearcher);

      const { data, error } = await getAttributes('/some/folder', container);

      expect(error).toBeUndefined();
      expect(data).toMatchObject({ mode: FOLDER_MODE, size: 0, nlink: 2 });
    });
  });

  describe('when a temporal file is found', () => {
    it('should return file attributes', async () => {
      container.get.calledWith(SingleFolderMatchingSearcher).mockReturnValue(folderSearcher);

      temporalFinder.run.mockResolvedValue(
        TemporalFile.from({
          createdAt: now,
          modifiedAt: now,
          path: '/some/temp.txt',
          size: 2048,
        }),
      );
      container.get.calledWith(TemporalFileByPathFinder).mockReturnValue(temporalFinder);

      const { data, error } = await getAttributes('/some/temp.txt', container);

      expect(error).toBeUndefined();
      expect(data).toMatchObject({ mode: FILE_MODE, size: 2048, nlink: 1 });
    });
  });

  describe('when nothing is found', () => {
    it('should return ENOENT error', async () => {
      container.get.calledWith(SingleFolderMatchingSearcher).mockReturnValue(folderSearcher);

      temporalFinder.run.mockResolvedValue(undefined);
      container.get.calledWith(TemporalFileByPathFinder).mockReturnValue(temporalFinder);

      const { data, error } = await getAttributes('/missing/file.txt', container);

      expect(data).toBeUndefined();
      expect(error?.code).toBe(FuseCodes.ENOENT);
    });
  });
});
