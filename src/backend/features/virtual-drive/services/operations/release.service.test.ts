import { mockDeep } from 'vitest-mock-extended';
import { Container } from 'diod';
import { release } from './release.service';
import { TemporalFileByPathFinder } from '../../../../../context/storage/TemporalFiles/application/find/TemporalFileByPathFinder';
import { TemporalFileUploader } from '../../../../../context/storage/TemporalFiles/application/upload/TemporalFileUploader';
import { TemporalFileDeleter } from '../../../../../context/storage/TemporalFiles/application/deletion/TemporalFileDeleter';
import { TemporalFile } from '../../../../../context/storage/TemporalFiles/domain/TemporalFile';
import { FuseCodes } from '../../../../../apps/drive/fuse/callbacks/FuseCodes';
import { call, calls } from '../../../../../../tests/vitest/utils.helper';

function createTemporalFile(path: string): TemporalFile {
  return TemporalFile.from({ path, size: 100, createdAt: new Date(), modifiedAt: new Date() });
}

function createAuxiliaryFile(path: string): TemporalFile {
  return TemporalFile.from({ path, size: 0, createdAt: new Date(), modifiedAt: new Date() });
}

describe('release', () => {
  let container: ReturnType<typeof mockDeep<Container>>;
  const finder = mockDeep<TemporalFileByPathFinder>();
  const uploader = mockDeep<TemporalFileUploader>();
  const deleter = mockDeep<TemporalFileDeleter>();

  beforeEach(() => {
    container = mockDeep<Container>();
    container.get.calledWith(TemporalFileByPathFinder).mockReturnValue(finder);
    container.get.calledWith(TemporalFileUploader).mockReturnValue(uploader);
    container.get.calledWith(TemporalFileDeleter).mockReturnValue(deleter);
  });

  describe('when no temporal file is found', () => {
    it('should return success without uploading', async () => {
      finder.run.mockResolvedValue(undefined);

      const { data, error } = await release({ path: '/Documents/file.pdf', processName: 'cat', container });

      expect(error).toBeUndefined();
      expect(data).toBeUndefined();
      calls(uploader.run).toHaveLength(0);
    });
  });

  describe('when an auxiliary file is found', () => {
    it('should return success without uploading', async () => {
      finder.run.mockResolvedValue(createAuxiliaryFile('/Documents/.~lock.file.odt#'));

      const { data, error } = await release({ path: '/Documents/.~lock.file.odt#', processName: 'cat', container });

      expect(error).toBeUndefined();
      expect(data).toBeUndefined();
      calls(uploader.run).toHaveLength(0);
    });
  });

  describe('when a temporal file is found', () => {
    it('should upload and return success', async () => {
      const temporalFile = createTemporalFile('/Documents/report.pdf');
      finder.run.mockResolvedValue(temporalFile);
      uploader.run.mockResolvedValue('contents-id-123');

      const { data, error } = await release({ path: '/Documents/report.pdf', processName: 'cat', container });

      expect(error).toBeUndefined();
      expect(data).toBeUndefined();
      call(uploader.run).toStrictEqual(temporalFile);
    });

    it('should delete the file and return EIO when upload fails', async () => {
      finder.run.mockResolvedValue(createTemporalFile('/Documents/report.pdf'));
      uploader.run.mockRejectedValue(new Error('Network error'));

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
      calls(uploader.run).toHaveLength(0);
      calls(deleter.run).toHaveLength(0);
    });
  });
});
