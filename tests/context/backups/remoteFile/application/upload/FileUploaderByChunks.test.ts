import { FileUploaderByChunks } from '../../../../../../src/context/backups/remoteFile/application/upload/FileUploaderByChunks';
import { RemoteFileRepositoryMock } from '../../__mocks__/RemoteFileRepositoryMock';
import { RemoteFileMother } from '../../domain/RemoteFileMother';
import { RemoteFileSizeMother } from '../../domain/RemoteFileSizeMother';

describe('FileUploaderByChunks', () => {
  let SUT: FileUploaderByChunks;

  let repository: RemoteFileRepositoryMock;
  let uploadChuckSpy: jest.SpyInstance<any, unknown[]>;

  const abortController = new AbortController();

  beforeAll(() => {
    repository = new RemoteFileRepositoryMock();

    SUT = new FileUploaderByChunks(repository);

    uploadChuckSpy = jest.spyOn(SUT as any, 'uploadChunk');
  });

  beforeEach(() => {
    jest.resetAllMocks();
  });

  const mapFileSizeToChunkSize: Record<'small' | 'medium' | 'big', number> = {
    small: 16,
    medium: 6,
    big: 2,
  };

  function calculateNumberOfChunks(
    type: 'small' | 'medium' | 'big',
    numberOfFiles: number
  ) {
    const size = mapFileSizeToChunkSize[type];

    return Math.ceil(numberOfFiles / size);
  }

  describe('upload by chunks', () => {
    it.each([0, 15, 16, 17])(
      'uploads %i small files in chunks of maximum 16 files',
      async (numberOfFiles: number) => {
        const files = RemoteFileMother.array(numberOfFiles, () => ({
          size: RemoteFileSizeMother.small().value,
        }));

        await SUT.run(files, abortController.signal);

        expect(uploadChuckSpy).toBeCalledTimes(
          calculateNumberOfChunks('small', numberOfFiles)
        );
      }
    );

    it.each([0, 5, 6, 7])(
      'uploads %i  medium files in chunks of maximum 6 files',
      async (numberOfFiles: number) => {
        const files = RemoteFileMother.array(numberOfFiles, () => ({
          size: RemoteFileSizeMother.medium().value,
        }));

        await SUT.run(files, abortController.signal);

        expect(uploadChuckSpy).toBeCalledTimes(
          calculateNumberOfChunks('medium', numberOfFiles)
        );
      }
    );

    it.each([0, 1, 2, 3])(
      'uploads %i big files in chunks of maximum 2 files',
      async (numberOfFiles: number) => {
        const files = RemoteFileMother.array(numberOfFiles, () => ({
          size: RemoteFileSizeMother.big().value,
        }));

        await SUT.run(files, abortController.signal);

        expect(uploadChuckSpy).toBeCalledTimes(
          calculateNumberOfChunks('big', numberOfFiles)
        );
      }
    );
  });

  it('does not mix sizes', async () => {
    const smallFiles = RemoteFileMother.array(17, () => ({
      size: RemoteFileSizeMother.small().value,
    }));

    const mediumFiles = [
      RemoteFileMother.fromPartial({
        size: RemoteFileSizeMother.medium().value,
      }),
    ];

    const mixedFileSizes = [...smallFiles, ...mediumFiles];

    await SUT.run(mixedFileSizes, abortController.signal);

    expect(uploadChuckSpy).toBeCalledTimes(
      calculateNumberOfChunks('small', smallFiles.length) +
        calculateNumberOfChunks('medium', mediumFiles.length)
    );
  });

  it('separates them by size', async () => {
    const oneFileOfEachSize = [
      RemoteFileMother.fromPartial({
        size: RemoteFileSizeMother.small().value,
      }),
      RemoteFileMother.fromPartial({
        size: RemoteFileSizeMother.medium().value,
      }),
      RemoteFileMother.fromPartial({
        size: RemoteFileSizeMother.big().value,
      }),
    ];

    await SUT.run(oneFileOfEachSize, abortController.signal);

    expect(uploadChuckSpy).toBeCalledTimes(oneFileOfEachSize.length);
  });
});
