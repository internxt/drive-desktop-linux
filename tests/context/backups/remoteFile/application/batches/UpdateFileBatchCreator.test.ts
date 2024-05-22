import { ModifiedFilesBatchCreator } from '../../../../../../src/apps/backups/batches/ModifiedFilesBatchCreator';
import { RemoteFile } from '../../../../../../src/context/local/remoteFile/domain/RemoteFile';
import { LocalFileMother } from '../../../localFile/domain/LocalFileMother';
import { LocalFileSizeMother } from '../../../localFile/domain/LocalFileSizeMother';
import { calculateNumberOfBatches } from './calculateNumberOfBatches';

describe('UpdateFileBatchCreator', () => {
  const SUT = new ModifiedFilesBatchCreator();

  function createNewerPairFilesFor(
    older: Array<RemoteFile>
  ): Array<[RemoteFile, RemoteFile]> {
    return older.map((older) => {
      const newer = LocalFileMother.fromPartial({
        ...older.attributes(),
        modificationTime: older.modificationTime + 1,
      });

      return [older, newer] satisfies [RemoteFile, RemoteFile];
    });
  }

  it('pairs the newer with the correct older one', () => {
    const files = createNewerPairFilesFor(LocalFileMother.array(10));

    const batches = SUT.run(files);

    batches.forEach((batch) =>
      batch.forEach(([older, newer]) => expect(older.path).toBe(newer.path))
    );
  });

  describe('batch sizes', () => {
    it.each([0, 15, 16, 17])(
      'separates %i small files in batches of maximum 16 files',
      async (numberOfFiles: number) => {
        const older = LocalFileMother.array(numberOfFiles, () => ({
          size: LocalFileSizeMother.small().value,
        }));

        const files = createNewerPairFilesFor(older);

        const batches = SUT.run(files);

        expect(batches.length).toBe(
          calculateNumberOfBatches('small', numberOfFiles)
        );
      }
    );

    it.each([0, 5, 6, 7])(
      'separates %i  medium files in batches of maximum 6 files',
      async (numberOfFiles: number) => {
        const older = LocalFileMother.array(numberOfFiles, () => ({
          size: LocalFileSizeMother.medium().value,
        }));

        const files = createNewerPairFilesFor(older);

        const batches = SUT.run(files);

        expect(batches.length).toBe(
          calculateNumberOfBatches('medium', numberOfFiles)
        );
      }
    );

    it.each([0, 1, 2, 3])(
      'separates %i big files in batches of maximum 2 files',
      async (numberOfFiles: number) => {
        const older = LocalFileMother.array(numberOfFiles, () => ({
          size: LocalFileSizeMother.big().value,
        }));

        const files = createNewerPairFilesFor(older);

        const batches = SUT.run(files);

        expect(batches.length).toBe(
          calculateNumberOfBatches('big', numberOfFiles)
        );
      }
    );
  });

  it('does not mix sizes', async () => {
    const smallOldFiles = LocalFileMother.array(17, () => ({
      size: LocalFileSizeMother.small().value,
    }));

    const mediumOldFiles = [
      LocalFileMother.fromPartial({
        size: LocalFileSizeMother.medium().value,
      }),
    ];
    const mixedOldFileSizes = [...smallOldFiles, ...mediumOldFiles];

    const mixedFiles = createNewerPairFilesFor(mixedOldFileSizes);

    const batches = SUT.run(mixedFiles);

    expect(batches.length).toBe(
      calculateNumberOfBatches('small', smallOldFiles.length) +
        calculateNumberOfBatches('medium', mediumOldFiles.length)
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

    const batches = SUT.run(createNewerPairFilesFor(oneFileOfEachSize));

    expect(batches.length).toBe(oneFileOfEachSize.length);
  });
});
