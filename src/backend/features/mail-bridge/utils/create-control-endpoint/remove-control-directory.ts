import { rmdir } from 'node:fs/promises';
import { dirname } from 'node:path';

export async function removeControlDirectory(endpoint: string): Promise<void> {
  await rmdir(dirname(endpoint));
}
