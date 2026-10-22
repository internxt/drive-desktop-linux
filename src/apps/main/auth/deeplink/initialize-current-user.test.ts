import { User } from '../../types';
import { loggerMock } from 'tests/vitest/mocks.helper';

const { refreshMock, updateCredentialsMock, configGetMock, updateUserMock } = vi.hoisted(() => ({
  refreshMock: vi.fn(),
  updateCredentialsMock: vi.fn(),
  configGetMock: vi.fn(),
  updateUserMock: vi.fn(),
}));

vi.mock('../../../../infra/drive-server/drive-server.module', () => ({
  driveServerModule: {
    auth: {
      refresh: refreshMock,
    },
  },
}));

vi.mock('../../config', () => ({
  default: {
    get: configGetMock,
  },
}));

vi.mock('../update-credentials', () => ({
  updateCredentials: updateCredentialsMock,
}));

vi.mock('../../../../backend/features/auth/update-user', () => ({
  updateUser: updateUserMock,
}));

describe('initializeCurrentUser', () => {
  let initializeCurrentUser: typeof import('./initialize-current-user').initializeCurrentUser;

  beforeAll(async () => {
    ({ initializeCurrentUser } = await import('./initialize-current-user'));
  });

  beforeEach(() => {
    loggerMock.error.mockImplementation((payload: { msg: string }) => {
      throw new Error(payload.msg);
    });
  });

  it('refreshes the user and updates the injected user state', async () => {
    const currentUser = {
      uuid: 'user-1',
      email: 'user@example.com',
      mnemonic: 'stored-mnemonic',
    } as User;

    const refreshData = {
      newToken: 'new-token',
      user: {
        uuid: 'user-1',
        email: 'updated@example.com',
        name: 'Updated User',
      },
    };

    configGetMock.mockReturnValue(currentUser);
    refreshMock.mockResolvedValue({
      isLeft: () => false,
      getRight: () => refreshData,
    });

    await initializeCurrentUser();

    expect(refreshMock).toHaveBeenCalledTimes(1);
    expect(updateCredentialsMock).toHaveBeenCalledWith({ newToken: 'new-token' });
    expect(configGetMock).toHaveBeenCalledWith('userData');
    expect(updateUserMock).toHaveBeenCalledWith({
      user: {
        ...currentUser,
        ...refreshData.user,
        mnemonic: currentUser.mnemonic,
      },
    });
    expect(loggerMock.debug).toHaveBeenCalledWith({
      tag: 'AUTH',
      msg: 'Current user initialized successfully',
    });
  });

  it('fails loudly when the refresh call returns a left value', async () => {
    refreshMock.mockResolvedValue({
      isLeft: () => true,
      getLeft: () => ({ message: 'refresh failed' }),
    });

    await expect(initializeCurrentUser()).rejects.toThrow('Failed to initialize current user');
    expect(updateCredentialsMock).not.toHaveBeenCalled();
    expect(updateUserMock).not.toHaveBeenCalled();
  });
});
