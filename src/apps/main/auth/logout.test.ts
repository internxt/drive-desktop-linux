import { call, calls } from 'tests/vitest/utils.helper';

const {
  closeUserSessionResourcesMock,
  getUserMock,
  saveConfigMock,
  authLogoutMock,
  eventBusEmitMock,
  configSetMock,
  configDeleteMock,
} = vi.hoisted(() => ({
  closeUserSessionResourcesMock: vi.fn(),
  getUserMock: vi.fn(),
  saveConfigMock: vi.fn(),
  authLogoutMock: vi.fn(),
  eventBusEmitMock: vi.fn(),
  configSetMock: vi.fn(),
  configDeleteMock: vi.fn(),
}));

vi.mock('./close-user-session-resources', () => ({
  closeUserSessionResources: closeUserSessionResourcesMock,
}));

vi.mock('./user-session', () => ({
  getUser: getUserMock,
}));

vi.mock('../config/save-config', () => ({
  saveConfig: saveConfigMock,
}));

vi.mock('../../../infra/drive-server/drive-server.module', () => ({
  driveServerModule: {
    auth: {
      logout: authLogoutMock,
    },
  },
}));

vi.mock('../event-bus', () => ({
  default: {
    emit: eventBusEmitMock,
  },
}));

vi.mock('../config', () => ({
  defaults: {
    backupsEnabled: false,
    preferedLanguage: 'en',
    lastOnboardingShown: '',
    mnemonic: '',
    mnemonicEncrypted: false,
    userData: {},
    newToken: '',
    newTokenEncrypted: false,
  },
  fieldsToSave: ['backupsEnabled', 'preferedLanguage', 'lastOnboardingShown'],
  default: {
    set: configSetMock,
    delete: configDeleteMock,
  },
}));

describe('logout', () => {
  let logout: typeof import('./logout').logout;
  let waitForLogoutToFinish: typeof import('./logout').waitForLogoutToFinish;

  beforeAll(async () => {
    ({ logout, waitForLogoutToFinish } = await import('./logout'));
  });

  beforeEach(() => {
    vi.clearAllMocks();

    closeUserSessionResourcesMock.mockResolvedValue(undefined);
    getUserMock.mockReturnValue({ uuid: 'user-1' });
  });

  it('should run cleanup once for concurrent logout calls', async () => {
    let releaseCleanup = () => {};
    const cleanupPromise = new Promise<void>((resolve) => {
      releaseCleanup = resolve;
    });
    closeUserSessionResourcesMock.mockReturnValueOnce(cleanupPromise);

    const firstLogout = logout();
    const secondLogout = logout();

    await Promise.resolve();

    expect(closeUserSessionResourcesMock).toHaveBeenCalledTimes(1);

    releaseCleanup();
    await Promise.all([firstLogout, secondLogout]);
  });

  it('should clear available products and emit product reset on logout', async () => {
    await logout();

    call(configDeleteMock).toBe('availableUserProducts');
    calls(eventBusEmitMock).toContainEqual(['USER_AVAILABLE_PRODUCTS_UPDATED', undefined]);
    calls(eventBusEmitMock).toContainEqual('USER_LOGGED_OUT');
  });

  it('should wait for in-flight logout when waitForLogoutToFinish is called', async () => {
    let releaseCleanup = () => {};
    const cleanupPromise = new Promise<void>((resolve) => {
      releaseCleanup = resolve;
    });
    closeUserSessionResourcesMock.mockReturnValueOnce(cleanupPromise);

    const inFlightLogout = logout();
    const waitPromise = waitForLogoutToFinish();

    let didWaitResolve = false;
    void waitPromise.then(() => {
      didWaitResolve = true;
    });

    await Promise.resolve();
    expect(didWaitResolve).toBe(false);

    releaseCleanup();

    await waitPromise;
    await inFlightLogout;
    expect(didWaitResolve).toBe(true);
  });
});
