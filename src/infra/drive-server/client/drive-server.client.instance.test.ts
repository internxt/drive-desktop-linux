import { partialSpyOn } from 'tests/vitest/utils.helper';

const { getNewApiHeadersMock, closeUserSessionMock } = vi.hoisted(() => ({
  getNewApiHeadersMock: vi.fn(),
  closeUserSessionMock: vi.fn(),
}));

vi.mock('../../../backend/features/auth', () => ({
  getNewApiHeaders: getNewApiHeadersMock,
}));

vi.mock('../../../apps/main/auth/handlers', () => ({
  closeUserSession: closeUserSessionMock,
}));

describe('driveServerClient instance', () => {
  let originalEnv: string | undefined;

  async function importAndSpy() {
    const driveServerClientModule = await import('../drive-server.client');
    const createClientMock = partialSpyOn(driveServerClientModule, 'createClient');

    await import('./drive-server.client.instance');

    return { createClientMock };
  }

  beforeEach(() => {
    originalEnv = process.env.NEW_DRIVE_URL;
    vi.resetModules();
  });

  afterEach(() => {
    if (originalEnv !== undefined) {
      process.env.NEW_DRIVE_URL = originalEnv;
    } else {
      Reflect.deleteProperty(process.env, 'NEW_DRIVE_URL');
    }
  });

  it('should call createClient with expected options', async () => {
    const { createClientMock } = await importAndSpy();

    expect(createClientMock).toBeCalledWith(
      expect.objectContaining({
        baseUrl: expect.any(String),
        authHeadersProvider: expect.any(Function),
        onUnauthorized: expect.any(Function),
      }),
    );
  });

  it('should use getNewApiHeaders as authHeadersProvider', async () => {
    const { createClientMock } = await importAndSpy();
    const clientOptions = createClientMock.mock.lastCall![0]!;

    expect(clientOptions.authHeadersProvider).toBe(getNewApiHeadersMock);
  });

  it('should use closeUserSession as onUnauthorized', async () => {
    const { createClientMock } = await importAndSpy();
    const clientOptions = createClientMock.mock.lastCall![0]!;

    expect(clientOptions.onUnauthorized).toBe(closeUserSessionMock);
  });

  it('should use process.env.NEW_DRIVE_URL as baseUrl', async () => {
    process.env.NEW_DRIVE_URL = 'https://mock.api';

    const { createClientMock } = await importAndSpy();

    expect(createClientMock).toBeCalledWith(expect.objectContaining({ baseUrl: 'https://mock.api' }));
  });
});
