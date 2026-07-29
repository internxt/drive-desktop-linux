import { call } from 'tests/vitest/utils.helper';

const {
  appFocusMock,
  eventBusEmitMock,
  canHisConfigBeRestoredMock,
  updateCredentialsMock,
  setIsLoggedInMock,
  closeUserSessionMock,
  setupRootFolderMock,
  processDeeplinkMock,
  initializeCurrentUserMock,
  configGetMock,
  waitForLogoutToFinishMock,
} = vi.hoisted(() => ({
  appFocusMock: vi.fn(),
  eventBusEmitMock: vi.fn(),
  canHisConfigBeRestoredMock: vi.fn(),
  updateCredentialsMock: vi.fn(),
  setIsLoggedInMock: vi.fn(),
  closeUserSessionMock: vi.fn(),
  setupRootFolderMock: vi.fn(),
  processDeeplinkMock: vi.fn(),
  initializeCurrentUserMock: vi.fn(),
  configGetMock: vi.fn(),
  waitForLogoutToFinishMock: vi.fn(),
}));

vi.mock('electron', () => ({
  app: {
    focus: appFocusMock,
  },
}));

vi.mock('../../event-bus', () => ({
  default: {
    emit: eventBusEmitMock,
  },
}));

vi.mock('../service', () => ({
  canHisConfigBeRestored: canHisConfigBeRestoredMock,
}));

vi.mock('../update-credentials', () => ({
  updateCredentials: updateCredentialsMock,
}));

vi.mock('../handlers', () => ({
  setIsLoggedIn: setIsLoggedInMock,
  closeUserSession: closeUserSessionMock,
}));

vi.mock('../../virtual-root-folder/service', () => ({
  setupRootFolder: setupRootFolderMock,
}));

vi.mock('./proccess-deeplink', () => ({
  processDeeplink: processDeeplinkMock,
}));

vi.mock('./initialize-current-user', () => ({
  initializeCurrentUser: initializeCurrentUserMock,
}));

vi.mock('../../config', () => ({
  default: {
    get: configGetMock,
  },
}));

vi.mock('../../../../core/electron/paths', () => ({
  PATHS: {
    ROOT_DRIVE_FOLDER: '/tmp/internxt-drive',
  },
}));

vi.mock('../logout', () => ({
  waitForLogoutToFinish: waitForLogoutToFinishMock,
}));

describe('handle-deeplink', () => {
  let handleDeeplink: typeof import('./handle-deeplink').handleDeeplink;

  beforeAll(async () => {
    ({ handleDeeplink } = await import('./handle-deeplink'));
  });

  beforeEach(() => {
    vi.clearAllMocks();

    waitForLogoutToFinishMock.mockResolvedValue(undefined);
    processDeeplinkMock.mockResolvedValue({ mnemonic: 'mnemonic-a', newToken: 'token-a' });
    updateCredentialsMock.mockResolvedValue(undefined);
    initializeCurrentUserMock.mockResolvedValue(undefined);
    configGetMock.mockReturnValue({ uuid: 'user-a' });
    canHisConfigBeRestoredMock.mockReturnValue(true);
  });

  it('should wait for logout before processing deeplink', async () => {
    await handleDeeplink({ url: 'internxt://login?x=1' });

    const waitOrder = waitForLogoutToFinishMock.mock.invocationCallOrder[0];
    const processOrder = processDeeplinkMock.mock.invocationCallOrder[0];

    expect(waitOrder).toBeLessThan(processOrder);
  });

  it('should return false when deeplink params are invalid', async () => {
    processDeeplinkMock.mockResolvedValue(undefined);

    const result = await handleDeeplink({ url: 'internxt://login?bad=true' });

    expect(result).toBe(false);
    expect(updateCredentialsMock).not.toHaveBeenCalled();
    expect(eventBusEmitMock).not.toHaveBeenCalled();
  });

  it('should complete login flow and emit USER_LOGGED_IN', async () => {
    const result = await handleDeeplink({ url: 'internxt://login?ok=true' });

    expect(result).toBe(true);
    call(updateCredentialsMock).toStrictEqual({ mnemonic: 'mnemonic-a', newToken: 'token-a' });
    call(setIsLoggedInMock).toBe(true);
    call(eventBusEmitMock).toBe('USER_LOGGED_IN');
    expect(canHisConfigBeRestoredMock).toHaveBeenCalledWith({ uuid: 'user-a' });
    expect(appFocusMock).toHaveBeenCalledTimes(1);
  });
});
