import { calls } from 'tests/vitest/utils.helper';
import { resetConfig } from './reset-config';

const { configSetMock, configDeleteMock, eventBusEmitMock } = vi.hoisted(() => ({
  configSetMock: vi.fn(),
  configDeleteMock: vi.fn(),
  eventBusEmitMock: vi.fn(),
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

vi.mock('../../../apps/main/event-bus', () => ({
  default: {
    emit: eventBusEmitMock,
  },
}));

describe('reset-config', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should reset fields from fieldsToSave that are not kept', () => {
    // When
    resetConfig();

    // Then
    calls(configSetMock).toContainEqual(['backupsEnabled', false]);
  });

  it('should not reset kept fields', () => {
    // When
    resetConfig();

    // Then
    const setCalls = configSetMock.mock.calls.map(([key]: [string]) => key);
    expect(setCalls).not.toContain('preferedLanguage');
    expect(setCalls).not.toContain('lastOnboardingShown');
  });

  it('should delete availableUserProducts', () => {
    // When
    resetConfig();

    // Then
    calls(configDeleteMock).toContainEqual('availableUserProducts');
  });

  it('should emit USER_AVAILABLE_PRODUCTS_UPDATED with undefined', () => {
    // When
    resetConfig();

    // Then
    calls(eventBusEmitMock).toContainEqual(['USER_AVAILABLE_PRODUCTS_UPDATED', undefined]);
  });

  it('should reset credentials', () => {
    // When
    resetConfig();

    // Then
    calls(configSetMock).toContainEqual(['mnemonic', '']);
    calls(configSetMock).toContainEqual(['mnemonicEncrypted', false]);
    calls(configSetMock).toContainEqual(['newToken', '']);
    calls(configSetMock).toContainEqual(['newTokenEncrypted', false]);
    calls(configSetMock).toContainEqual(['userData', {}]);
  });
});
