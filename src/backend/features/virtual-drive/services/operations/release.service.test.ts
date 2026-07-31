import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mockDeep } from 'vitest-mock-extended';
import { release } from './release.service';
import { TemporalFileByPathFinder } from '../../../../../context/storage/TemporalFiles/application/find/TemporalFileByPathFinder';
import type { TemporalFileUploadQueue as TemporalFileUploadQueueService } from '../../../../../context/storage/TemporalFiles/application/upload/TemporalFileUploadQueue/types';
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
} from '../../../user/file-size-limit/upload-size-limit-blocked-paths';

vi.mock('../../../user/file-size-limit', () => ({}));

const { addVirtualDriveIssueMock } = vi.hoisted(() => ({
  addVirtualDriveIssueMock: vi.fn(),
}));

vi.mock('../../../../../apps/main/issues/virtual-drive', () => ({
  addVirtualDriveIssue: addVirtualDriveIssueMock,
}));

function createTemporalFile(path: string): TemporalFile {
  return TemporalFile.from({ path, size: 100, createdAt: new Date(), modifiedAt: new Date() });
}

function createAuxiliaryFile(path: string): TemporalFile {
  return TemporalFile.from({ path, size: 0, createdAt: new Date(), modifiedAt: new Date() });
}

describe('release', () => {
  const finder = mockDeep<TemporalFileByPathFinder>();
  const queue = mockDeep<TemporalFileUploadQueueService>();
  const deleter = mockDeep<TemporalFileDeleter>();

  beforeEach(() => {
    addVirtualDriveIssueMock.mockReset();
    queue.enqueue.mockResolvedValue({ data: undefined });
    clearUploadSizeLimitBlockedPath('/Documents/report.pdf');
  });

  describe('when no temporal file is found', () => {
    it('should return success without uploading', async () => {
      finder.run.mockResolvedValue(undefined);

      const { data, error } = await release({
        path: '/Documents/file.pdf',
        processName: 'cat',
        findTemporalFileByPath: finder.run.bind(finder),
        deleteTemporalFile: deleter.run.bind(deleter),
        enqueueTemporalFile: queue.enqueue.bind(queue),
      });

      expect(error).toBeUndefined();
      expect(data).toBeUndefined();
      calls(queue.enqueue).toHaveLength(0);
    });
  });

  describe('when an auxiliary file is found', () => {
    it('should return success, skip upload and delete it', async () => {
      finder.run.mockResolvedValue(createAuxiliaryFile('/Documents/.~lock.file.odt#'));

      const { data, error } = await release({
        path: '/Documents/.~lock.file.odt#',
        processName: 'cat',
        findTemporalFileByPath: finder.run.bind(finder),
        deleteTemporalFile: deleter.run.bind(deleter),
        enqueueTemporalFile: queue.enqueue.bind(queue),
      });

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

      const { data, error } = await release({
        path: '/Documents/report.pdf',
        processName: 'cat',
        findTemporalFileByPath: finder.run.bind(finder),
        deleteTemporalFile: deleter.run.bind(deleter),
        enqueueTemporalFile: queue.enqueue.bind(queue),
      });

      expect(error).toBeUndefined();
      expect(data).toBeUndefined();
      call(queue.enqueue).toStrictEqual({ temporalFile, path: '/Documents/report.pdf', processName: 'cat' });
    });

    it('should delete partial temporal file and skip upload when write already blocked it by upload size limit', async () => {
      const temporalFile = createTemporalFile('/Documents/report.pdf');
      finder.run.mockResolvedValue(temporalFile);
      markUploadSizeLimitBlockedPath('/Documents/report.pdf');

      const { data, error } = await release({
        path: '/Documents/report.pdf',
        processName: 'cat',
        findTemporalFileByPath: finder.run.bind(finder),
        deleteTemporalFile: deleter.run.bind(deleter),
        enqueueTemporalFile: queue.enqueue.bind(queue),
      });

      expect(error).toBeUndefined();
      expect(data).toBeUndefined();
      calls(queue.enqueue).toHaveLength(0);
      call(deleter.run).toStrictEqual('/Documents/report.pdf');
      expect(isUploadSizeLimitBlockedPath('/Documents/report.pdf')).toBe(false);
    });

    it('should preserve the temporal file and return success when queue rejects by upload size limit', async () => {
      finder.run.mockResolvedValue(createTemporalFile('/Documents/report.pdf'));
      queue.enqueue.mockResolvedValue({ error: new UploadSizeLimitError() });

      const { data, error } = await release({
        path: '/Documents/report.pdf',
        processName: 'cat',
        findTemporalFileByPath: finder.run.bind(finder),
        deleteTemporalFile: deleter.run.bind(deleter),
        enqueueTemporalFile: queue.enqueue.bind(queue),
      });

      expect(error).toBeUndefined();
      expect(data).toBeUndefined();
      calls(deleter.run).toHaveLength(0);
    });

    it('should preserve the temporal file and return EIO when upload preflight fails because drive space is insufficient', async () => {
      finder.run.mockResolvedValue(createTemporalFile('/Documents/report.pdf'));
      queue.enqueue.mockResolvedValue({ error: new DriveDesktopError('NOT_ENOUGH_SPACE', 'No space left') });

      const { data, error } = await release({
        path: '/Documents/report.pdf',
        processName: 'cat',
        findTemporalFileByPath: finder.run.bind(finder),
        deleteTemporalFile: deleter.run.bind(deleter),
        enqueueTemporalFile: queue.enqueue.bind(queue),
      });

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
      queue.enqueue.mockResolvedValue({ error: new Error('Network error') });

      const { data, error } = await release({
        path: '/Documents/report.pdf',
        processName: 'cat',
        findTemporalFileByPath: finder.run.bind(finder),
        deleteTemporalFile: deleter.run.bind(deleter),
        enqueueTemporalFile: queue.enqueue.bind(queue),
      });

      expect(data).toBeUndefined();
      expect(error?.code).toBe(FuseCodes.EIO);
      call(deleter.run).toStrictEqual('/Documents/report.pdf');
    });
  });

  describe('when finder throws an unexpected error', () => {
    it('should return EIO without uploading or deleting', async () => {
      finder.run.mockRejectedValue(new Error('DB error'));

      const { data, error } = await release({
        path: '/Documents/report.pdf',
        processName: 'cat',
        findTemporalFileByPath: finder.run.bind(finder),
        deleteTemporalFile: deleter.run.bind(deleter),
        enqueueTemporalFile: queue.enqueue.bind(queue),
      });

      expect(data).toBeUndefined();
      expect(error?.code).toBe(FuseCodes.EIO);
      calls(queue.enqueue).toHaveLength(0);
      calls(deleter.run).toHaveLength(0);
    });
  });
});
