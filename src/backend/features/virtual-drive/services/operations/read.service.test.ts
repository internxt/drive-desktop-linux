import { mockDeep } from 'vitest-mock-extended';
import { Container } from 'diod';
import { read } from './read.service';
import * as handleReadCallbackModule from '../../../../features/fuse/on-read/handle-read-callback';
import { partialSpyOn } from '../../../../../../tests/vitest/utils.helper';
import { FirstsFileSearcher } from '../../../../../context/virtual-drive/files/application/search/FirstsFileSearcher';
import { TemporalFileByPathFinder } from '../../../../../context/storage/TemporalFiles/application/find/TemporalFileByPathFinder';
import { StorageFilesRepository } from '../../../../../context/storage/StorageFiles/domain/StorageFilesRepository';
import { FuseCodes } from '../../../../../apps/drive/fuse/callbacks/FuseCodes';

const handleReadCallbackMock = partialSpyOn(handleReadCallbackModule, 'handleReadCallback');

describe('read', () => {
  let container: ReturnType<typeof mockDeep<Container>>;
  const fileSearcher = mockDeep<FirstsFileSearcher>();
  const temporalFinder = mockDeep<TemporalFileByPathFinder>();
  const repo = mockDeep<StorageFilesRepository>();
  beforeEach(() => {
    container = mockDeep<Container>();
    container.get.calledWith(FirstsFileSearcher).mockReturnValue(fileSearcher);
    container.get.calledWith(TemporalFileByPathFinder).mockReturnValue(temporalFinder);
    container.get.calledWith(StorageFilesRepository).mockReturnValue(repo);
  });

  describe('when handleReadCallback succeeds', () => {
    it('should return the buffer from handleReadCallback', async () => {
      const chunk = Buffer.from('file data');
      handleReadCallbackMock.mockResolvedValue({ data: chunk });

      const { data, error } = await read('/file.mp4', 10, 0, 'vlc', container);

      expect(error).toBeUndefined();
      expect(data).toBe(chunk);
    });

    it('should forward path, length, position and processName to handleReadCallback', async () => {
      handleReadCallbackMock.mockResolvedValue({ data: Buffer.alloc(0) });

      await read('/file.mp4', 32768, 4096, 'vlc', container);

      expect(handleReadCallbackMock).toHaveBeenCalledWith(expect.any(Object), '/file.mp4', 32768, 4096, 'vlc');
    });
  });

  describe('when handleReadCallback returns an error', () => {
    it('should propagate the error', async () => {
      handleReadCallbackMock.mockResolvedValue({ error: { code: FuseCodes.ENOENT } as any });

      const { data, error } = await read('/missing.mp4', 10, 0, 'vlc', container);

      expect(data).toBeUndefined();
      expect(error?.code).toBe(FuseCodes.ENOENT);
    });
  });

  describe('when an unexpected error is thrown', () => {
    it('should return EIO', async () => {
      handleReadCallbackMock.mockRejectedValue(new Error('unexpected'));

      const { data, error } = await read('/file.mp4', 10, 0, 'vlc', container);

      expect(data).toBeUndefined();
      expect(error?.code).toBe(FuseCodes.EIO);
    });
  });
});
