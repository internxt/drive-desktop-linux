import { mkdtemp, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { removeControlDirectory } from './remove-control-directory';

describe('removeControlDirectory', () => {
  let directory: string;
  let endpoint: string;

  beforeEach(async () => {
    directory = await mkdtemp(join(tmpdir(), 'internxt-mail-remove-test-'));
    endpoint = join(directory, 'control.sock');
  });

  afterEach(async () => {
    await rm(directory, { recursive: true, force: true });
  });

  it('removes the empty directory containing the endpoint', async () => {
    await removeControlDirectory(endpoint);

    await expect(stat(directory)).rejects.toMatchObject({ code: 'ENOENT' });
  });

  it('rejects when the directory does not exist', async () => {
    await rm(directory, { recursive: true });

    await expect(removeControlDirectory(endpoint)).rejects.toMatchObject({ code: 'ENOENT' });
  });

  it('preserves a directory that still contains files', async () => {
    await writeFile(endpoint, 'occupied');

    await expect(removeControlDirectory(endpoint)).rejects.toMatchObject({ code: 'ENOTEMPTY' });
    expect((await stat(endpoint)).isFile()).toBe(true);
  });
});
