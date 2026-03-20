import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import { FileBatchUploader } from './FileBatchUploader';
import { LocalFileUploaderMock } from '../__mocks__/LocalFileUploaderMock';
import { SimpleFileCreator } from '../../../../virtual-drive/files/application/create/SimpleFileCreator';
import { RemoteFileSystem } from '../../../../virtual-drive/files/domain/file-systems/RemoteFileSystem';
import { LocalFileMother } from '../../domain/__test-helpers__/LocalFileMother';
import { RemoteTreeMother } from '../../../../virtual-drive/remoteTree/domain/__test-helpers__/RemoteTreeMother';
import { FileMother } from '../../../../virtual-drive/files/domain/__test-helpers__/FileMother';
import { AbsolutePath } from '../../infrastructure/AbsolutePath';
import { left, right } from '../../../../shared/domain/Either';
import { DriveDesktopError } from '../../../../shared/domain/errors/DriveDesktopError';
import path from 'path';

vi.mock('../../../../../backend/features/backup', () => ({
  backupErrorsTracker: { add: vi.fn() },
}));

vi.mock('../../../../../infra/drive-server/services/files/services/delete-file-content-from-bucket', () => ({
  deleteFileFromStorageByFileId: vi.fn().mockResolvedValue(undefined),
}));

const ROOT = '/local/backup' as AbsolutePath;
const BUCKET = 'test-bucket';
const CONTENTS_ID = 'mock-contents-id';

describe('FileBatchUploader', () => {
  let SUT: FileBatchUploader;
  let uploader: LocalFileUploaderMock;
  let creator: SimpleFileCreator;
  let abortController: AbortController;
  let onFileProcessed: ReturnType<typeof vi.fn>;

  beforeAll(() => {
    uploader = new LocalFileUploaderMock();
    creator = new SimpleFileCreator({} as RemoteFileSystem);
    SUT = new FileBatchUploader(uploader, creator, BUCKET);
  });

  beforeEach(() => {
    vi.resetAllMocks();
    abortController = new AbortController();
    onFileProcessed = vi.fn();
  });

  describe('successful upload', () => {
    it('calls onFileProcessed once per file when all succeed', async () => {
      const files = LocalFileMother.array(3, (i) => ({
        path: path.join(ROOT, `file-${i}.txt`) as AbsolutePath,
      }));

      const tree = RemoteTreeMother.onlyRoot();

      vi.spyOn(uploader, 'upload').mockResolvedValue(right(CONTENTS_ID));
      vi.spyOn(creator, 'run').mockImplementation(() => Promise.resolve(right(FileMother.any())));

      await SUT.run(ROOT, tree, files, abortController.signal, onFileProcessed);

      expect(onFileProcessed).toHaveBeenCalledTimes(files.length);
    });

    it('adds the created file to the remote tree', async () => {
      const file = LocalFileMother.fromPartial({ path: path.join(ROOT, 'new.txt') as AbsolutePath });
      const remoteFile = FileMother.fromPartial({ path: '/new.txt' });

      const tree = RemoteTreeMother.onlyRoot();
      const addFileSpy = vi.spyOn(tree, 'addFile');

      vi.spyOn(uploader, 'upload').mockResolvedValue(right(CONTENTS_ID));
      vi.spyOn(creator, 'run').mockResolvedValue(right(remoteFile));

      await SUT.run(ROOT, tree, [file], abortController.signal, onFileProcessed);

      expect(addFileSpy).toHaveBeenCalledWith(tree.root, remoteFile);
    });
  });

  describe('upload errors', () => {
    it('calls onFileProcessed and continues when upload throws', async () => {
      const files = LocalFileMother.array(2, (i) => ({
        path: path.join(ROOT, `file-${i}.txt`) as AbsolutePath,
      }));

      const tree = RemoteTreeMother.onlyRoot();

      vi.spyOn(uploader, 'upload')
        .mockRejectedValueOnce(new Error('network error'))
        .mockResolvedValueOnce(right(CONTENTS_ID));
      vi.spyOn(creator, 'run').mockImplementation(() => Promise.resolve(right(FileMother.any())));

      await SUT.run(ROOT, tree, files, abortController.signal, onFileProcessed);

      expect(onFileProcessed).toHaveBeenCalledTimes(2);
    });

    it('calls onFileProcessed and continues on non-fatal upload failure', async () => {
      const file = LocalFileMother.fromPartial({ path: path.join(ROOT, 'fail.txt') as AbsolutePath });
      const tree = RemoteTreeMother.onlyRoot();

      vi.spyOn(uploader, 'upload').mockResolvedValue(left(new DriveDesktopError('BAD_RESPONSE', 'Upload failed')));

      await SUT.run(ROOT, tree, [file], abortController.signal, onFileProcessed);

      expect(onFileProcessed).toHaveBeenCalledTimes(1);
    });

    it('throws and does NOT call onFileProcessed on fatal upload failure', async () => {
      const file = LocalFileMother.fromPartial({ path: path.join(ROOT, 'fatal.txt') as AbsolutePath });
      const tree = RemoteTreeMother.onlyRoot();

      vi.spyOn(uploader, 'upload').mockResolvedValue(left(new DriveDesktopError('NO_INTERNET', 'No connection')));

      await expect(SUT.run(ROOT, tree, [file], abortController.signal, onFileProcessed)).rejects.toThrow();
      expect(onFileProcessed).not.toHaveBeenCalled();
    });
  });

  describe('file creation errors', () => {
    it('calls onFileProcessed and continues on FILE_ALREADY_EXISTS', async () => {
      const file = LocalFileMother.fromPartial({ path: path.join(ROOT, 'exists.txt') as AbsolutePath });
      const tree = RemoteTreeMother.onlyRoot();

      vi.spyOn(uploader, 'upload').mockResolvedValue(right(CONTENTS_ID));
      vi.spyOn(creator, 'run').mockResolvedValue(left(new DriveDesktopError('FILE_ALREADY_EXISTS', 'Already exists')));

      await SUT.run(ROOT, tree, [file], abortController.signal, onFileProcessed);

      expect(onFileProcessed).toHaveBeenCalledTimes(1);
    });

    it('calls onFileProcessed and continues on BAD_RESPONSE from creator', async () => {
      const file = LocalFileMother.fromPartial({ path: path.join(ROOT, 'bad.txt') as AbsolutePath });
      const tree = RemoteTreeMother.onlyRoot();

      vi.spyOn(uploader, 'upload').mockResolvedValue(right(CONTENTS_ID));
      vi.spyOn(creator, 'run').mockResolvedValue(left(new DriveDesktopError('BAD_RESPONSE', 'Server error')));

      await SUT.run(ROOT, tree, [file], abortController.signal, onFileProcessed);

      expect(onFileProcessed).toHaveBeenCalledTimes(1);
    });

    it('throws and does NOT call onFileProcessed on unexpected creator error', async () => {
      const file = LocalFileMother.fromPartial({ path: path.join(ROOT, 'unk.txt') as AbsolutePath });
      const tree = RemoteTreeMother.onlyRoot();

      vi.spyOn(uploader, 'upload').mockResolvedValue(right(CONTENTS_ID));
      vi.spyOn(creator, 'run').mockResolvedValue(left(new DriveDesktopError('UNKNOWN', 'Unexpected')));

      await expect(SUT.run(ROOT, tree, [file], abortController.signal, onFileProcessed)).rejects.toThrow();
      expect(onFileProcessed).not.toHaveBeenCalled();
    });
  });

  describe('abort signal', () => {
    it('stops processing when signal is already aborted', async () => {
      const files = LocalFileMother.array(3, (i) => ({
        path: path.join(ROOT, `file-${i}.txt`) as AbsolutePath,
      }));
      const tree = RemoteTreeMother.onlyRoot();
      const uploadSpy = vi.spyOn(uploader, 'upload');

      abortController.abort();

      await SUT.run(ROOT, tree, files, abortController.signal, onFileProcessed);

      expect(uploadSpy).not.toHaveBeenCalled();
      expect(onFileProcessed).not.toHaveBeenCalled();
    });
  });
});
