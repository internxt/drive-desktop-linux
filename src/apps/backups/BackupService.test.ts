import { vi, Mock } from 'vitest';
import { mockDeep } from 'vitest-mock-extended';
import { BackupService } from './BackupService';
import LocalTreeBuilder from '../../context/local/localTree/application/LocalTreeBuilder';
import { RemoteTreeBuilder } from '../../context/virtual-drive/remoteTree/application/RemoteTreeBuilder';
import { FileBatchUploader } from '../../context/local/localFile/application/upload/FileBatchUploader';
import { FileBatchUpdater } from '../../context/local/localFile/application/update/FileBatchUpdater';
import { SimpleFolderCreator } from '../../context/virtual-drive/folders/application/create/SimpleFolderCreator';
import { BackupInfo } from './BackupInfo';
import { DriveDesktopError } from '../../context/shared/domain/errors/DriveDesktopError';
import { LocalTreeMother } from '../../context/local/localTree/domain/__test-helpers__/LocalTreeMother';
import { RemoteTreeMother } from '../../context/virtual-drive/remoteTree/domain/__test-helpers__/RemoteTreeMother';
import { left, right } from '../../context/shared/domain/Either';
import { RemoteTree } from '../../context/virtual-drive/remoteTree/domain/RemoteTree';
import { UsageModule } from '../../backend/features/usage/usage.module';
import { FolderMother } from '../../context/virtual-drive/folders/domain/__test-helpers__/FolderMother';
import { BackupProgressTracker } from '../../backend/features/backup/backup-progress-tracker';

// Mock the UsageModule
vi.mock('../../backend/features/usage/usage.module', () => ({
  UsageModule: {
    validateSpace: vi.fn(),
  },
}));

// Mock the Environment module
vi.mock('@internxt/inxt-js', () => ({
  Environment: {
    get: vi.fn(),
  },
}));

describe('BackupService', () => {
  let backupService: BackupService;
  let localTreeBuilder: LocalTreeBuilder;
  let remoteTreeBuilder: RemoteTreeBuilder;
  let fileBatchUploader: FileBatchUploader;
  let fileBatchUpdater: FileBatchUpdater;
  let simpleFolderCreator: SimpleFolderCreator;
  let mockValidateSpace: Mock;
  let abortController: AbortController;
  let tracker: BackupProgressTracker;

  beforeEach(() => {
    localTreeBuilder = mockDeep<LocalTreeBuilder>();
    remoteTreeBuilder = mockDeep<RemoteTreeBuilder>();
    fileBatchUploader = mockDeep<FileBatchUploader>();
    fileBatchUpdater = mockDeep<FileBatchUpdater>();
    simpleFolderCreator = mockDeep<SimpleFolderCreator>();
    tracker = mockDeep<BackupProgressTracker>();

    mockValidateSpace = UsageModule.validateSpace as Mock;
    abortController = new AbortController();

    // Setup default mock implementations
    vi.mocked(simpleFolderCreator.run).mockResolvedValue(FolderMother.any());

    backupService = new BackupService(
      localTreeBuilder,
      remoteTreeBuilder,
      fileBatchUploader,
      fileBatchUpdater,
      simpleFolderCreator,
    );

    mockValidateSpace.mockClear();
  });

  it('should successfully run the backup process', async () => {
    const info: BackupInfo = {
      pathname: '/path/to/backup',
      folderId: 123,
      folderUuid: 'uuid',
      tmpPath: '/tmp/path',
      backupsBucket: 'backups-bucket',
      name: 'backup-name',
    };
    const localTree = LocalTreeMother.oneLevel(10);
    const remoteTree = RemoteTreeMother.oneLevel(10);

    vi.mocked(localTreeBuilder.run).mockResolvedValueOnce(right(localTree));
    vi.mocked(remoteTreeBuilder.run).mockResolvedValueOnce(remoteTree);
    mockValidateSpace.mockResolvedValueOnce({ data: { hasSpace: true } });

    const result = await backupService.run(info, abortController.signal, tracker);

    expect(result).toBeUndefined();
    expect(localTreeBuilder.run).toHaveBeenCalledWith(info.pathname);
    expect(remoteTreeBuilder.run).toHaveBeenCalledWith(info.folderId, info.folderUuid);
    expect(tracker.addToTotal).toHaveBeenCalled();
    expect(tracker.incrementProcessed).toHaveBeenCalled();
  });

  it('should return an error if local tree generation fails', async () => {
    const info: BackupInfo = {
      pathname: '/path/to/backup',
      folderId: 123,
      folderUuid: 'uuid',
      tmpPath: '/tmp/path',
      backupsBucket: 'backups-bucket',
      name: 'backup-name',
    };
    const error = new DriveDesktopError('NOT_EXISTS', 'Failed to generate local tree');

    vi.mocked(localTreeBuilder.run).mockResolvedValueOnce(left(error));

    const result = await backupService.run(info, abortController.signal, tracker);

    expect(result).toBe(error);
    expect(localTreeBuilder.run).toHaveBeenCalledWith(info.pathname);
  });

  it('should return an error if remote tree generation fails', async () => {
    const info: BackupInfo = {
      pathname: '/path/to/backup',
      folderId: 123,
      folderUuid: 'uuid',
      tmpPath: '/tmp/path',
      backupsBucket: 'backups-bucket',
      name: 'backup-name',
    };
    const error = new DriveDesktopError('NOT_EXISTS', 'Failed to generate remote tree');

    // Mock the behavior of dependencies
    vi.mocked(localTreeBuilder.run).mockResolvedValueOnce(right(LocalTreeMother.oneLevel(10)));
    vi.mocked(remoteTreeBuilder.run).mockResolvedValueOnce(left(error) as unknown as RemoteTree);

    const result = await backupService.run(info, abortController.signal, tracker);

    expect(result).toStrictEqual(new DriveDesktopError('UNKNOWN', 'An unknown error occurred'));
    expect(remoteTreeBuilder.run).toHaveBeenCalledWith(info.folderId, info.folderUuid);
  });

  it('should return an error if there is not enough space', async () => {
    const info: BackupInfo = {
      pathname: '/path/to/backup',
      folderId: 123,
      folderUuid: 'uuid',
      tmpPath: '/tmp/path',
      backupsBucket: 'backups-bucket',
      name: 'backup-name',
    };

    (localTreeBuilder.run as Mock).mockResolvedValueOnce(right(LocalTreeMother.oneLevel(10)));
    (remoteTreeBuilder.run as Mock).mockResolvedValueOnce(RemoteTreeMother.oneLevel(10));
    mockValidateSpace.mockResolvedValueOnce({ data: { hasSpace: false } });

    const result = await backupService.run(info, abortController.signal, tracker);

    expect(result).toBeDefined();
  });

  it('should return an unknown error for unexpected issues', async () => {
    const info: BackupInfo = {
      pathname: '/path/to/backup',
      folderId: 123,
      folderUuid: 'uuid',
      tmpPath: '/tmp/path',
      backupsBucket: 'backups-bucket',
      name: 'backup-name',
    };

    vi.mocked(localTreeBuilder.run).mockImplementationOnce(() => {
      throw new Error('Unexpected error');
    });

    const result = await backupService.run(info, abortController.signal, tracker);

    expect(result).toBeInstanceOf(DriveDesktopError);
    expect(result?.message).toBe('An unknown error occurred');
  });
});
