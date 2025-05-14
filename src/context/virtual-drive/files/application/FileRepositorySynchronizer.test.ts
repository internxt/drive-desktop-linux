import { FileRepositorySynchronizer } from './FileRepositorySynchronizer';
import { FileRepository } from '../domain/FileRepository';
import { left, right } from '../../../shared/domain/Either';
import { File } from '../domain/File';
import { StorageFileService } from '../../../storage/StorageFiles/StorageFileService';
import { driveServerModule } from '../../../../infra/drive-server/drive-server.module';

// Mock the Environment module
jest.mock('@internxt/inxt-js', () => ({
  Environment: {
    get: jest.fn(),
  },
}));

jest.mock('../../../../infra/drive-server/drive-server.module', () => ({
  driveServerModule: {
    files: {
      deleteFileFromTrash: jest.fn(),
    },
  },
}));

describe('FileRepositorySynchronizer', () => {
  let sut: FileRepositorySynchronizer;
  let fileRepositoryMock: jest.Mocked<FileRepository>;
  let storageFileServiceMock: jest.Mocked<StorageFileService>;

  beforeEach(() => {
    fileRepositoryMock = {
      searchByArrayOfContentsId: jest.fn(),
      clear: jest.fn(),
      upsert: jest.fn(),
    } as unknown as jest.Mocked<FileRepository>;

    storageFileServiceMock = {
      isFileDownloadable: jest.fn(),
    } as unknown as jest.Mocked<StorageFileService>;

    sut = new FileRepositorySynchronizer(
      fileRepositoryMock,
      storageFileServiceMock
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('fixDanglingFiles', () => {
    it('should not continue with the execution if there are no files in memory repository given the array of contentsIds', async () => {
      fileRepositoryMock.searchByArrayOfContentsId.mockResolvedValue([]);

      const result = await sut.fixDanglingFiles(['file1', 'file2']);

      expect(fileRepositoryMock.searchByArrayOfContentsId).toHaveBeenCalledWith(
        ['file1', 'file2']
      );
      expect(storageFileServiceMock.isFileDownloadable).not.toHaveBeenCalled();
      expect(
        driveServerModule.files.deleteFileFromTrash
      ).not.toHaveBeenCalled();
      expect(result).toBe(true);
    });
    it('should check every found file if is downloadable and call remoteFileSystem.hardDelete', async () => {
      const files = [
        { contentsId: 'file1' },
        { contentsId: 'file2' },
      ] as unknown as File[];

      fileRepositoryMock.searchByArrayOfContentsId.mockResolvedValue(files);
      storageFileServiceMock.isFileDownloadable
        .mockResolvedValueOnce(right(false)) // File1 is NOT downloadable
        .mockResolvedValueOnce(right(true)); // File2 is downloadable

      (
        driveServerModule.files.deleteFileFromTrash as jest.Mock
      ).mockResolvedValue(right(true));

      const result = await sut.fixDanglingFiles(['file1', 'file2']);

      expect(storageFileServiceMock.isFileDownloadable).toHaveBeenCalledTimes(
        2
      );
      expect(driveServerModule.files.deleteFileFromTrash).toHaveBeenCalledTimes(
        1
      );
      expect(driveServerModule.files.deleteFileFromTrash).toHaveBeenCalledWith(
        'file1'
      );
      expect(result).toBe(true);
    });

    it('should return false if the deletion of the file was not successful', async () => {
      const files = [{ contentsId: 'file1' }] as unknown as File[];

      fileRepositoryMock.searchByArrayOfContentsId.mockResolvedValue(files);
      storageFileServiceMock.isFileDownloadable.mockResolvedValueOnce(
        right(false)
      );

      (
        driveServerModule.files.deleteFileFromTrash as jest.Mock
      ).mockResolvedValue(
        left(
          new Error('Response delete file from trash contained unexpected data')
        )
      );
      const result = await sut.fixDanglingFiles(['file1']);

      expect(storageFileServiceMock.isFileDownloadable).toHaveBeenCalledTimes(
        1
      );
      expect(driveServerModule.files.deleteFileFromTrash).toHaveBeenCalledTimes(
        1
      );
      expect(driveServerModule.files.deleteFileFromTrash).toHaveBeenCalledWith(
        'file1'
      );
      expect(result).toBe(false);
    });

    it('should return false if there is an error trying to retrieve files', async () => {
      fileRepositoryMock.searchByArrayOfContentsId.mockRejectedValue(
        new Error('Test failure')
      );

      const result = await sut.fixDanglingFiles(['file1', 'file2']);
      expect(result).toBe(false);
    });
    it('should return true if not a single error was found while checking all of the files', async () => {
      const files = [
        { contentsId: 'file1' },
        { contentsId: 'file2' },
      ] as unknown as File[];

      fileRepositoryMock.searchByArrayOfContentsId.mockResolvedValue(files);
      storageFileServiceMock.isFileDownloadable.mockResolvedValue(right(true)); // Both files are downloadable

      const result = await sut.fixDanglingFiles(['file1', 'file2']);

      expect(storageFileServiceMock.isFileDownloadable).toHaveBeenCalledTimes(
        2
      );
      expect(
        driveServerModule.files.deleteFileFromTrash
      ).not.toHaveBeenCalled();
      expect(result).toBe(true);
    });
  });
});
