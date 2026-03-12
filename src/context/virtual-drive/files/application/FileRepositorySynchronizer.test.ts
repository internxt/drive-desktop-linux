import { FileRepositorySynchronizer } from './FileRepositorySynchronizer';
import { FileRepository } from '../domain/FileRepository';
import { StorageFileService } from '../../../storage/StorageFiles/StorageFileService';
import { Mocked } from 'vitest';

// Mock the Environment module
vi.mock('@internxt/inxt-js', () => ({
  Environment: {
    get: vi.fn(),
  },
}));

describe('FileRepositorySynchronizer', () => {
  let sut: FileRepositorySynchronizer;
  let fileRepositoryMock: Mocked<FileRepository>;
  let storageFileServiceMock: Mocked<StorageFileService>;

  beforeEach(() => {
    fileRepositoryMock = {
      searchByArrayOfContentsId: vi.fn(),
      clear: vi.fn(),
      upsert: vi.fn(),
    } as unknown as Mocked<FileRepository>;

    storageFileServiceMock = {
      isFileDownloadable: vi.fn(),
    } as unknown as Mocked<StorageFileService>;

    sut = new FileRepositorySynchronizer(fileRepositoryMock, storageFileServiceMock);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });
});
