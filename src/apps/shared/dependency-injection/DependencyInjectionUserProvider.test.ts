import ConfigStore from '../../main/config';
import { User } from '../../main/types';
import { partialSpyOn } from 'tests/vitest/utils.helper';
import { DependencyInjectionUserProvider } from './DependencyInjectionUserProvider';

describe('DependencyInjectionUserProvider', () => {
  const getConfigMock = partialSpyOn(ConfigStore, 'get');
  const setConfigMock = partialSpyOn(ConfigStore, 'set');

  const userA: User = {
    uuid: 'user-a',
    email: 'a@test.com',
  } as User;

  const userB: User = {
    uuid: 'user-b',
    email: 'b@test.com',
  } as User;

  beforeEach(() => {
    DependencyInjectionUserProvider.clearUser();
    getConfigMock.mockReset();
    setConfigMock.mockReset();
  });

  it('reloads user from config after clearUser for account switches', () => {
    getConfigMock.mockReturnValueOnce(userA).mockReturnValueOnce(userB);

    const firstUser = DependencyInjectionUserProvider.get();
    const cachedUser = DependencyInjectionUserProvider.get();

    DependencyInjectionUserProvider.clearUser();
    const secondUser = DependencyInjectionUserProvider.get();

    expect(firstUser.uuid).toBe('user-a');
    expect(cachedUser.uuid).toBe('user-a');
    expect(secondUser.uuid).toBe('user-b');
    expect(getConfigMock).toHaveBeenCalledTimes(2);
  });

  it('updateUser refreshes cache and persists user in config', () => {
    DependencyInjectionUserProvider.updateUser(userA);

    const resolvedUser = DependencyInjectionUserProvider.get();

    expect(resolvedUser).toStrictEqual(userA);
    expect(setConfigMock).toHaveBeenCalledWith('userData', userA);
    expect(getConfigMock).toHaveBeenCalledTimes(0);
  });
});