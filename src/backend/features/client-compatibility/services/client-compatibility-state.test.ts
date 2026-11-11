import { call, partialSpyOn } from 'tests/vitest/utils.helper';

describe('client-compatibility-state', () => {
  async function importState() {
    const eventBus = (await import('../../../../apps/main/event-bus')).default;
    const emitMock = partialSpyOn(eventBus, 'emit');
    const module = await import('./client-compatibility-state');
    return { ...module, emitMock };
  }

  beforeEach(() => {
    vi.resetModules();
  });

  it('should start as up to date', async () => {
    // Given
    const { getClientCompatibility, isClientUnsupported } = await importState();
    // Then
    expect(getClientCompatibility()).toStrictEqual({ status: 'up_to_date' });
    expect(isClientUnsupported()).toBe(false);
  });

  it('should not emit anything when the version is up to date', async () => {
    // Given
    const { setClientCompatibility, emitMock } = await importState();
    // When
    setClientCompatibility({ state: { status: 'up_to_date' } });
    // Then
    expect(emitMock).not.toHaveBeenCalled();
  });

  it('should emit the state when an update is recommended', async () => {
    // Given
    const { setClientCompatibility, emitMock } = await importState();
    const state = { status: 'deprecated', sunsetAt: '2026-12-01T00:00:00.000Z' } as const;
    // When
    setClientCompatibility({ state });
    // Then
    call(emitMock).toStrictEqual(['CLIENT_COMPATIBILITY_CHANGED', state]);
  });

  it('should stay unsupported for the rest of the session', async () => {
    // Given
    const { setClientCompatibility, getClientCompatibility, isClientUnsupported, emitMock } = await importState();
    // When
    setClientCompatibility({ state: { status: 'unsupported' } });
    setClientCompatibility({ state: { status: 'up_to_date' } });
    // Then
    expect(isClientUnsupported()).toBe(true);
    expect(getClientCompatibility()).toStrictEqual({ status: 'unsupported' });
    call(emitMock).toStrictEqual(['CLIENT_COMPATIBILITY_CHANGED', { status: 'unsupported' }]);
  });
});
