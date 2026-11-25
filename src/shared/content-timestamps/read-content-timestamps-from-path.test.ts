import { describe, expect, it } from 'vitest';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { readContentTimestampsFromPath } from './read-content-timestamps-from-path';

describe('readContentTimestampsFromPath', () => {
  it('returns timestamps for an existing file', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'content-ts-'));
    const filePath = join(dir, 'sample.txt');
    await writeFile(filePath, 'hello');

    const result = await readContentTimestampsFromPath({ absolutePath: filePath });

    expect(result).toBeDefined();
    expect(result?.modificationTime).toBeInstanceOf(Date);
    expect(result?.creationTime).toBeInstanceOf(Date);

    await rm(dir, { recursive: true, force: true });
  });

  it('returns undefined when the path does not exist', async () => {
    const result = await readContentTimestampsFromPath({
      absolutePath: join(tmpdir(), 'missing-file-content-ts'),
    });

    expect(result).toBeUndefined();
  });
});
