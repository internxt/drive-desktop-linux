import { AddedFilesBatchCreator } from '../../../../../../src/apps/backups/batches/AddedFilesBatchCreator';
import { LocalFileMother } from '../../../localFile/domain/LocalFileMother';
import { LocalFileSizeMother } from '../../../localFile/domain/LocalFileSizeMother';
import { calculateNumberOfBatches } from './calculateNumberOfBatches';

describe('UploadFileBatchCreator', () => {
  let SUT: AddedFilesBatchCreator;

  beforeAll(() => {
    SUT = new AddedFilesBatchCreator();
  });

  beforeEach(() => {
    jest.resetAllMocks();
  });

  describe('batch sizes', () => {
    it.each([0, 15, 16, 17])(
      'separates %i small files in batches of maximum 16 files',
      async (numberOfFiles: number) => {
        const files = LocalFileMother.array(numberOfFiles, () => ({
          size: LocalFileSizeMother.small().value,
        }));

        const batches = SUT.run(files);

        expect(batches.length).toBe(
          calculateNumberOfBatches('small', numberOfFiles)
        );
      }
    );

    it.each([0, 5, 6, 7])(
      'separates %i  medium files in batches of maximum 6 files',
      async (numberOfFiles: number) => {
        const files = LocalFileMother.array(numberOfFiles, () => ({
          size: LocalFileSizeMother.medium().value,
        }));

        const batches = SUT.run(files);

        expect(batches.length).toBe(
          calculateNumberOfBatches('medium', numberOfFiles)
        );
      }
    );

    it.each([0, 1, 2, 3])(
      'separates %i big files in batches of maximum 2 files',
      async (numberOfFiles: number) => {
        const files = LocalFileMother.array(numberOfFiles, () => ({
          size: LocalFileSizeMother.big().value,
        }));

        const batches = SUT.run(files);

        expect(batches.length).toBe(
          calculateNumberOfBatches('big', numberOfFiles)
        );
      }
    );
  });

  it('does not mix sizes', async () => {
    const smallFiles = LocalFileMother.array(17, () => ({
      size: LocalFileSizeMother.small().value,
    }));

    const mediumFiles = [
      LocalFileMother.fromPartial({
        size: LocalFileSizeMother.medium().value,
      }),
    ];

    const mixedFileSizes = [...smallFiles, ...mediumFiles];

    const batches = SUT.run(mixedFileSizes);

    expect(batches.length).toBe(
      calculateNumberOfBatches('small', smallFiles.length) +
        calculateNumberOfBatches('medium', mediumFiles.length)
    );
  });

  it('separates them by size', async () => {
    const oneFileOfEachSize = [
      LocalFileMother.fromPartial({
        size: LocalFileSizeMother.small().value,
      }),
      LocalFileMother.fromPartial({
        size: LocalFileSizeMother.medium().value,
      }),
      LocalFileMother.fromPartial({
        size: LocalFileSizeMother.big().value,
      }),
    ];

    const batches = SUT.run(oneFileOfEachSize);

    expect(batches.length).toBe(oneFileOfEachSize.length);
  });
});
