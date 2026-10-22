import { rmdir, stat } from 'node:fs/promises';
import { basename, dirname } from 'node:path';
import { createControlEndpoint } from './create-control-endpoint';

describe('createControlEndpoint', () => {
  const directories: string[] = [];

  afterEach(async () => {
    await Promise.all(directories.splice(0).map((directory) => rmdir(directory)));
  });

  async function createEndpoint() {
    const endpoint = await createControlEndpoint();
    directories.push(dirname(endpoint));
    return endpoint;
  }

  it('isolates each launch in a different directory', async () => {
    const first = await createEndpoint();
    const second = await createEndpoint();

    expect(dirname(first)).not.toBe(dirname(second));
  });

  it('creates a private directory and returns a Unix socket path', async () => {
    const endpoint = await createEndpoint();
    const directory = await stat(dirname(endpoint));

    expect(directory.isDirectory()).toBe(true);
    expect(directory.mode & 0o777).toBe(0o700);
    expect(basename(endpoint)).toBe('control.sock');
    expect(Buffer.byteLength(endpoint)).toBeLessThan(108);
    await expect(stat(endpoint)).rejects.toMatchObject({ code: 'ENOENT' });
  });
});
