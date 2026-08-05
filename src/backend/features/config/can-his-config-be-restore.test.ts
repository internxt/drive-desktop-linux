import { canHisConfigBeRestored } from './can-his-config-be-restore';

const { configGetMock, configSetMock } = vi.hoisted(() => ({
  configGetMock: vi.fn(),
  configSetMock: vi.fn(),
}));

vi.mock('../../../apps/main/config', () => ({
  defaults: {
    lastOnboardingShown: '',
    backupsEnabled: false,
  },
  default: {
    get: configGetMock,
    set: configSetMock,
  },
}));

vi.mock('../../../apps/main/config/save-config', () => ({
  savedConfigFields: ['lastOnboardingShown', 'backupsEnabled'],
}));

describe('can-his-config-be-restore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return false when there are no saved configs', () => {
    // Given
    configGetMock.mockReturnValue(undefined);

    // When
    const result = canHisConfigBeRestored({ uuid: 'user-1' });

    // Then
    expect(result).toBe(false);
  });

  it('should return false when the uuid has no saved config', () => {
    // Given
    configGetMock.mockReturnValue({ 'other-uuid': {} });

    // When
    const result = canHisConfigBeRestored({ uuid: 'user-1' });

    // Then
    expect(result).toBe(false);
  });

  it('should restore saved config fields and return true', () => {
    // Given
    configGetMock.mockReturnValue({
      'user-1': { lastOnboardingShown: '2024-01-01', backupsEnabled: true },
    });

    // When
    const result = canHisConfigBeRestored({ uuid: 'user-1' });

    // Then
    expect(result).toBe(true);
    expect(configSetMock).toHaveBeenCalledWith('lastOnboardingShown', '2024-01-01');
    expect(configSetMock).toHaveBeenCalledWith('backupsEnabled', true);
  });

  it('should fall back to defaults for missing fields in saved config', () => {
    // Given
    configGetMock.mockReturnValue({
      'user-1': { lastOnboardingShown: '2024-01-01' },
    });

    // When
    const result = canHisConfigBeRestored({ uuid: 'user-1' });

    // Then
    expect(result).toBe(true);
    expect(configSetMock).toHaveBeenCalledWith('backupsEnabled', false);
  });
});
