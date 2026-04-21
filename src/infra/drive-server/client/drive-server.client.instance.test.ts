import { closeUserSession } from '../../../apps/main/auth/handlers';
import { getNewApiHeaders } from '../../../apps/main/auth/service';
import { createClient } from '../drive-server.client';
import { call } from 'tests/vitest/utils.helper';

vi.mock('../drive-server.client', () => ({
  createClient: vi.fn(() => ({})),
}));

vi.mock('../../../apps/main/auth/service', () => ({
  getNewApiHeaders: vi.fn(() => ({ Authorization: 'Bearer token' })),
}));

vi.mock('../../../apps/main/auth/handlers', () => ({
  closeUserSession: vi.fn(),
}));

describe('driveServerClient instance', () => {
  let originalEnv: string | undefined;

  beforeEach(() => {
    originalEnv = process.env.NEW_DRIVE_URL;
    vi.resetModules();
  });

  afterEach(() => {
    if (originalEnv !== undefined) {
      process.env.NEW_DRIVE_URL = originalEnv;
    } else {
      delete (process.env as any).NEW_DRIVE_URL;
    }
  });

  it('should call createClient with expected options', async () => {
    await import('./drive-server.client.instance');

    call(createClient).toMatchObject({
      baseUrl: expect.any(String),
      authHeadersProvider: expect.any(Function),
      onUnauthorized: expect.any(Function),
    });
  });

  it('should call getNewApiHeaders when authHeadersProvider is triggered', async () => {
    await import('./drive-server.client.instance');
    const createClientCalls = vi.mocked(createClient).mock.calls;
    const [{ authHeadersProvider }] = createClientCalls[0]!;

    authHeadersProvider!();

    expect(getNewApiHeaders).toHaveBeenCalled();
  });

  it('should call closeUserSession when onUnauthorized is triggered', async () => {
    await import('./drive-server.client.instance');
    const [{ onUnauthorized }] = vi.mocked(createClient).mock.calls[0]!;

    onUnauthorized!();

    expect(closeUserSession).toHaveBeenCalled();
  });

  it('should use process.env.NEW_DRIVE_URL as baseUrl', async () => {
    process.env.NEW_DRIVE_URL = 'https://mock.api';

    await import('./drive-server.client.instance');

    call(createClient).toMatchObject({ baseUrl: 'https://mock.api' });
  });
});
