import { mockDeep } from 'vitest-mock-extended';
import { Container } from 'diod';
import { FuseCodes } from '../../../../../apps/drive/fuse/callbacks/FuseCodes';
import { TemporalFileWriter } from '../../../../../context/storage/TemporalFiles/application/write/TemporalFileWriter';
import { write } from './write.service';

vi.mock('@internxt/drive-desktop-core/build/backend');

describe('write', () => {
  let container: ReturnType<typeof mockDeep<Container>>;
  const temporalFileWriter = mockDeep<TemporalFileWriter>();

  beforeEach(() => {
    container = mockDeep<Container>();
    container.get.calledWith(TemporalFileWriter).mockReturnValue(temporalFileWriter);
  });

  it('should write bytes into temporal file and return written length', async () => {
    const content = Buffer.from('hello');

    const { data, error } = await write({
      path: '/some/file.txt',
      content,
      offset: 7,
      container,
    });

    expect(error).toBeUndefined();
    expect(data).toBe(content.length);
    expect(temporalFileWriter.run).toHaveBeenCalledWith('/some/file.txt', content, content.length, 7);
  });

  it('should return EIO when temporal write fails', async () => {
    temporalFileWriter.run.mockRejectedValue(new Error('boom'));

    const { data, error } = await write({
      path: '/some/file.txt',
      content: Buffer.from('hello'),
      offset: 0,
      container,
    });

    expect(data).toBeUndefined();
    expect(error?.code).toBe(FuseCodes.EIO);
  });
});
