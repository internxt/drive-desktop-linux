import { mockDeep } from 'vitest-mock-extended';
import { Container, type Identifier } from 'diod';
import { release } from './release.service';
import { TemporalFileByPathFinder } from '../../../../../context/storage/TemporalFiles/application/find/TemporalFileByPathFinder';
import { TemporalFileUploadQueue } from '../../../../../context/storage/TemporalFiles/application/upload/TemporalFileUploadQueue';
import { TemporalFileDeleter } from '../../../../../context/storage/TemporalFiles/application/deletion/TemporalFileDeleter';
import { TemporalFile } from '../../../../../context/storage/TemporalFiles/domain/TemporalFile';
import { FuseCodes } from '../../../../../apps/drive/fuse/callbacks/FuseCodes';
import { UploadSizeLimitError } from '../../../user/file-size-limit/upload-size-limit-error';
import { DriveDesktopError } from '../../../../../context/shared/domain/errors/DriveDesktopError';
import { call, calls } from '../../../../../../tests/vitest/utils.helper';
import {
  clearUploadSizeLimitBlockedPath,
  isUploadSizeLimitBlockedPath,
  markUploadSizeLimitBlockedPath,
} from '../../../user/file-size-limit/add-max-file-size-rejection';

const { addVirtualDriveIssueMock } = vi.hoisted(() => ({
  addVirtualDriveIssueMock: vi.fn(),
}));

vi.mock('../../../../../apps/main/issues/virtual-drive', () => ({
  addVirtualDriveIssue: addVirtualDriveIssueMock,
}));

function createTemporalFile(path: string): TemporalFile {
  return TemporalFile.from({ path, size: 100, createdAt: new Date(), modifiedAt: new Date() });
}

function asIdentifier(identifier: unknown): Identifier<unknown> {
  return identifier as unknown as Identifier<unknown>;
}

function createAuxiliaryFile(path: string): TemporalFile {
  return TemporalFile.from({ path, size: 0, createdAt: new Date(), modifiedAt: new Date() });
}

describe('release', () => {
  let container: ReturnType<typeof mockDeep<Container>>;
  const finder = mockDeep<TemporalFileByPathFinder>();
  const queue = mockDeep<TemporalFileUploadQueue>();
  const deleter = mockDeep<TemporalFileDeleter>();

  beforeEach(() => {
    container = mockDeep<Container>();
    container.get.calledWith(asIdentifier(TemporalFileByPathFinder)).mockReturnValue(finder);
    container.get.calledWith(asIdentifier(TemporalFileUploadQueue)).mockReturnValue(queue);
    container.get.calledWith(asIdentifier(TemporalFileDeleter)).mockReturnValue(deleter);
    addVirtualDriveIssueMock.mockReset();
    queue.enqueue.mockResolvedValue(undefined);
    clearUploadSizeLimitBlockedPath('/Documents/report.pdf');
  });

  describe('when no temporal file is found', () => {
    it('should return success without uploading', async () => {
      finder.run.mockResolvedValue(undefined);

      const { data, error } = await release({ path: '/Documents/file.pdf', processName: 'cat', container });

      expect(error).toBeUndefined();
      expect(data).toBeUndefined();
      calls(queue.enqueue).toHaveLength(0);
    });
  });

  describe('when an auxiliary file is found', () => {
    it('should return success, skip upload and delete it', async () => {
      finder.run.mockResolvedValue(createAuxiliaryFile('/Documents/.~lock.file.odt#'));

      const { data, error } = await release({ path: '/Documents/.~lock.file.odt#', processName: 'cat', container });

      expect(error).toBeUndefined();
      expect(data).toBeUndefined();
      calls(queue.enqueue).toHaveLength(0);
      call(deleter.run).toStrictEqual('/Documents/.~lock.file.odt#');
    });
  });

  describe('when a temporal file is found', () => {
    it('should enqueue upload work', async () => {
      const temporalFile = createTemporalFile('/Documents/report.pdf');
      finder.run.mockResolvedValue(temporalFile);

      const { data, error } = await release({ path: '/Documents/report.pdf', processName: 'cat', container });

      expect(error).toBeUndefined();
      expect(data).toBeUndefined();
      call(queue.enqueue).toStrictEqual({ temporalFile, path: '/Documents/report.pdf', processName: 'cat' });
    });

    it('should delete partial temporal file and skip upload when write already blocked it by upload size limit', async () => {
      const temporalFile = createTemporalFile('/Documents/report.pdf');
      finder.run.mockResolvedValue(temporalFile);
      markUploadSizeLimitBlockedPath('/Documents/report.pdf');

      const { data, error } = await release({ path: '/Documents/report.pdf', processName: 'cat', container });

      expect(error).toBeUndefined();
      expect(data).toBeUndefined();
      calls(queue.enqueue).toHaveLength(0);
      call(deleter.run).toStrictEqual('/Documents/report.pdf');
      expect(isUploadSizeLimitBlockedPath('/Documents/report.pdf')).toBe(false);
    });

    it('should preserve the temporal file and return success when queue rejects by upload size limit', async () => {
      finder.run.mockResolvedValue(createTemporalFile('/Documents/report.pdf'));
      queue.enqueue.mockRejectedValue(new UploadSizeLimitError());

      const { data, error } = await release({ path: '/Documents/report.pdf', processName: 'cat', container });

      expect(error).toBeUndefined();
      expect(data).toBeUndefined();
      calls(deleter.run).toHaveLength(0);
    });

    it('should preserve the temporal file and return EIO when upload preflight fails because drive space is insufficient', async () => {
      finder.run.mockResolvedValue(createTemporalFile('/Documents/report.pdf'));
      queue.enqueue.mockRejectedValue(new DriveDesktopError('NOT_ENOUGH_SPACE', 'No space left'));

      const { data, error } = await release({ path: '/Documents/report.pdf', processName: 'cat', container });

      expect(data).toBeUndefined();
      expect(error?.code).toBe(FuseCodes.EIO);
      expect(addVirtualDriveIssueMock).toHaveBeenCalledWith({
        error: 'UPLOAD_ERROR',
        cause: 'NOT_ENOUGH_SPACE',
        name: 'report.pdf',
      });
      calls(deleter.run).toHaveLength(0);
    });

    it('should delete the file and return EIO when upload fails', async () => {
      finder.run.mockResolvedValue(createTemporalFile('/Documents/report.pdf'));
      queue.enqueue.mockRejectedValue(new Error('Network error'));

      const { data, error } = await release({ path: '/Documents/report.pdf', processName: 'cat', container });

      expect(data).toBeUndefined();
      expect(error?.code).toBe(FuseCodes.EIO);
      call(deleter.run).toStrictEqual('/Documents/report.pdf');
    });
  });

  describe('when finder throws an unexpected error', () => {
    it('should return EIO without uploading or deleting', async () => {
      finder.run.mockRejectedValue(new Error('DB error'));

      const { data, error } = await release({ path: '/Documents/report.pdf', processName: 'cat', container });

      expect(data).toBeUndefined();
      expect(error?.code).toBe(FuseCodes.EIO);
      calls(queue.enqueue).toHaveLength(0);
      calls(deleter.run).toHaveLength(0);
    });
  });
});
