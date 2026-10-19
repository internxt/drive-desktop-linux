import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// A private directory prevents other local users from accessing the control socket.
export async function createControlEndpoint(): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), 'internxt-mail-'));
  return join(directory, 'control.sock');
}
