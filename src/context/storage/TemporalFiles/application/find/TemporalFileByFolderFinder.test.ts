import { mockDeep } from 'vitest-mock-extended';
import { call } from '../../../../../../tests/vitest/utils.helper';
import { Optional } from '../../../../../shared/types/Optional';
import { TemporalFile } from '../../domain/TemporalFile';
import { TemporalFilePath } from '../../domain/TemporalFilePath';
import { TemporalFileRepository } from '../../domain/TemporalFileRepository';
import { TemporalFileByFolderFinder } from './TemporalFileByFolderFinder';

describe('TemporalFileByFolderFinder', () => {
  const repository = mockDeep<TemporalFileRepository>();

  const folder = '/Pics/.strata-replacement-gKlrIt';
  const child = TemporalFile.from({
    createdAt: new Date('2026-10-31T01:53:04.000Z'),
    modifiedAt: new Date('2026-10-31T01:53:04.000Z'),
    path: `${folder}/PD_0064.JPG`,
    size: 318692,
  });

  beforeEach(() => {
    repository.matchingDirectory.mockResolvedValue([]);
    repository.find.mockResolvedValue(Optional.empty());
  });

  it('should return temporal files inside the folder, not its parent', async () => {
    repository.matchingDirectory.mockImplementation(async (directory) => {
      if (directory === folder) return [new TemporalFilePath(child.path.value)];
      return [];
    });
    repository.find.mockResolvedValue(Optional.of(child));

    const files = await new TemporalFileByFolderFinder(repository).run(`${folder}/`);

    expect(files).toHaveLength(1);
    expect(files[0].nameWithExtension).toBe('PD_0064.JPG');
    call(repository.matchingDirectory).toBe(folder);
  });
});
