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

vi.mock('../../../apps/main/auth/close-user-session-resources', () => ({
  closeUserSessionResources: closeUserSessionResourcesMock,
}));

vi.mock('./user-session', () => ({
  getUser: getUserMock,
}));

vi.mock('../../../apps/main/config/save-config', () => ({
  saveConfig: saveConfigMock,
}));

vi.mock('../../../infra/drive-server/drive-server.module', () => ({
  driveServerModule: {
    auth: {
      logout: authLogoutMock,
    },
  },
}));

vi.mock('../../../apps/main/event-bus', () => ({
  default: {
    emit: eventBusEmitMock,
  },
}));

vi.mock('../../../apps/main/config', () => ({
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

  beforeAll(async () => {
    ({ logout } = await import('./logout'));
  });

  beforeEach(() => {
    closeUserSessionResourcesMock.mockResolvedValue(undefined);
    getUserMock.mockReturnValue({ uuid: 'user-1' });
  });

  it('should clear available products and emit product reset on logout', async () => {
    await logout();

    call(configDeleteMock).toBe('availableUserProducts');
    calls(eventBusEmitMock).toContainEqual(['USER_AVAILABLE_PRODUCTS_UPDATED', undefined]);
    calls(eventBusEmitMock).toContainEqual('USER_LOGGED_OUT');
  });
});
