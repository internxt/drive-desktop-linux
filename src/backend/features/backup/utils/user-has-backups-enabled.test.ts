import configStore from '../../../../apps/main/config';
import { userHasBackupsEnabled } from './user-has-backups-enabled';
import { UserAvailableProducts } from '@internxt/drive-desktop-core/build/backend';
import { partialSpyOn } from 'tests/vitest/utils.helper';

describe('userHasBackupsEnabled', () => {
  const configGetMock = partialSpyOn(configStore, 'get');

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return true when backups are enabled for the user', () => {
    configGetMock.mockReturnValue({ backups: true } as unknown as UserAvailableProducts);

    const result = userHasBackupsEnabled();

    expect(result).toBe(true);
    expect(configGetMock).toHaveBeenCalledWith('availableUserProducts');
  });

  it('should return false when backups are not enabled for the user', () => {
    configGetMock.mockReturnValue({ backups: false } as unknown as UserAvailableProducts);

    const result = userHasBackupsEnabled();

    expect(result).toBe(false);
  });

  it('should return false when availableUserProducts is undefined or null', () => {
    configGetMock.mockReturnValue(undefined);

    const resultUndefined = userHasBackupsEnabled();

    expect(resultUndefined).toBe(false);

    configGetMock.mockReturnValue(null as unknown as undefined);

    const resultNull = userHasBackupsEnabled();

    expect(resultNull).toBe(false);
  });

  it('should return false when availableUserProducts.backups is undefined or null', () => {
    configGetMock.mockReturnValue({ backups: undefined } as unknown as UserAvailableProducts);

    const resultUndefined = userHasBackupsEnabled();

    expect(resultUndefined).toBe(false);

    configGetMock.mockReturnValue({ backups: null } as unknown as UserAvailableProducts);

    const resultNull = userHasBackupsEnabled();

    expect(resultNull).toBe(false);
  });

  it('should handle unexpected data types gracefully', () => {
    // Empty object
    configGetMock.mockReturnValue({} as unknown as UserAvailableProducts);
    expect(userHasBackupsEnabled()).toBe(false);

    // backups is 0
    configGetMock.mockReturnValue({ backups: 0 } as unknown as UserAvailableProducts);
    expect(userHasBackupsEnabled()).toBe(false);

    // backups is empty string
    configGetMock.mockReturnValue({ backups: '' } as unknown as UserAvailableProducts);
    expect(userHasBackupsEnabled()).toBe(false);

    // backups is non-empty string (truthy)
    configGetMock.mockReturnValue({ backups: 'enabled' } as unknown as UserAvailableProducts);
    expect(userHasBackupsEnabled()).toBe(true);

    // backups is an object (truthy)
    configGetMock.mockReturnValue({ backups: {} } as unknown as UserAvailableProducts);
    expect(userHasBackupsEnabled()).toBe(true);
  });
});
