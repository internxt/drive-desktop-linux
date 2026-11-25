import { mockDeep } from 'vitest-mock-extended';
import { TemporalFilePath } from '../../domain/TemporalFilePath';
import { TemporalFileRepository } from '../../domain/TemporalFileRepository';
import { moveTemporalFile } from './move-temporal-file';
import { call } from '../../../../../../tests/vitest/utils.helper';

describe('move-temporal-file', () => {
  it('should refile the staged copy from the temp path to the document path', async () => {
    const repository = mockDeep<TemporalFileRepository>();

    await moveTemporalFile({ repository, from: '/lu371445na4g.tmp', to: '/save_test.odt' });

    call(repository.move).toStrictEqual([
      new TemporalFilePath('/lu371445na4g.tmp'),
      new TemporalFilePath('/save_test.odt'),
    ]);
  });
});
