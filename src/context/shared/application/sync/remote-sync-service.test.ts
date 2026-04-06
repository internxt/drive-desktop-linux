describe('remote-sync-service.test', () => {
  it('should throw when the remote sync service has not been registered', async () => {
    // Given
    vi.resetModules();
    const { getRemoteSyncService } = await import('./remote-sync-service');

    // When
    const getService = () => getRemoteSyncService();

    // Then
    expect(getService).toThrow('Remote sync service has not been registered');
  });

  it('should return the registered remote sync service', async () => {
    // Given
    vi.resetModules();
    const { getRemoteSyncService, registerRemoteSyncService } = await import('./remote-sync-service');
    const service = {
      getUpdatedRemoteItems: vi.fn(),
      startRemoteSync: vi.fn(),
      resyncRemoteSync: vi.fn(),
    };

    // When
    registerRemoteSyncService(service);

    // Then
    expect(getRemoteSyncService()).toBe(service);
  });
});
