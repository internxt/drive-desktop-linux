import { calls, partialSpyOn } from 'tests/vitest/utils.helper';
import eventBus from '../event-bus';
import * as bootstrapStateModule from './app-data-source-bootstrap-state';
import { bootstrapAppDataSource } from './bootstrap-app-data-source';
import * as appDataSourceModule from './data-source';
import * as virtualDriveSqliteModule from './initialize-virtual-drive-sqlite';

vi.mock('../event-bus', () => ({
  default: {
    emit: vi.fn(),
  },
}));

vi.mock('./data-source', () => ({
  AppDataSource: {
    isInitialized: false,
    initialize: vi.fn(),
  },
}));

vi.mock('./initialize-virtual-drive-sqlite', () => ({
  initializeVirtualDriveSqlite: vi.fn(),
  migrateLegacyRemoteSyncSchemaOnDisk: vi.fn(),
}));

describe('bootstrap-app-data-source', () => {
  const eventBusEmitSpy = partialSpyOn(eventBus, 'emit');
  const appDataSourceInitializeSpy = partialSpyOn(appDataSourceModule.AppDataSource, 'initialize');
  const appDataSourceIsInitializedSpy = vi.spyOn(appDataSourceModule.AppDataSource, 'isInitialized', 'get');
  const initializeVirtualDriveSqliteSpy = partialSpyOn(virtualDriveSqliteModule, 'initializeVirtualDriveSqlite');
  const migrateLegacyRemoteSyncSchemaOnDiskSpy = partialSpyOn(
    virtualDriveSqliteModule,
    'migrateLegacyRemoteSyncSchemaOnDisk',
  );
  const getIsAppDataSourceBootstrapCompleteSpy = partialSpyOn(
    bootstrapStateModule,
    'getIsAppDataSourceBootstrapComplete',
  );
  const setAppDataSourceBootstrapCompleteSpy = partialSpyOn(bootstrapStateModule, 'setAppDataSourceBootstrapComplete');
  const resetAppDataSourceBootstrapStateSpy = partialSpyOn(bootstrapStateModule, 'resetAppDataSourceBootstrapState');

  beforeEach(() => {
    appDataSourceIsInitializedSpy.mockReturnValue(false);
    appDataSourceInitializeSpy.mockResolvedValue({} as never);
    initializeVirtualDriveSqliteSpy.mockResolvedValue(undefined);
    migrateLegacyRemoteSyncSchemaOnDiskSpy.mockImplementation(() => undefined);
    getIsAppDataSourceBootstrapCompleteSpy.mockReturnValue(false);
  });

  it('should migrate on disk, initialize typeorm, bootstrap sqlite, and emit once', async () => {
    await bootstrapAppDataSource();

    expect(migrateLegacyRemoteSyncSchemaOnDiskSpy).toHaveBeenCalledTimes(1);
    expect(resetAppDataSourceBootstrapStateSpy).toHaveBeenCalledTimes(1);
    expect(appDataSourceInitializeSpy).toHaveBeenCalledTimes(1);
    expect(initializeVirtualDriveSqliteSpy).toHaveBeenCalledTimes(1);
    expect(setAppDataSourceBootstrapCompleteSpy).toHaveBeenCalledWith(true);
    expect(eventBusEmitSpy).toHaveBeenCalledWith('APP_DATA_SOURCE_INITIALIZED');
    expect(migrateLegacyRemoteSyncSchemaOnDiskSpy.mock.invocationCallOrder[0]).toBeLessThan(
      appDataSourceInitializeSpy.mock.invocationCallOrder[0],
    );
  });

  it('should skip sqlite bootstrap when it already completed in this session', async () => {
    getIsAppDataSourceBootstrapCompleteSpy.mockReturnValue(true);
    appDataSourceIsInitializedSpy.mockReturnValue(true);

    await bootstrapAppDataSource();

    expect(migrateLegacyRemoteSyncSchemaOnDiskSpy).toHaveBeenCalledTimes(1);
    calls(appDataSourceInitializeSpy).toHaveLength(0);
    calls(initializeVirtualDriveSqliteSpy).toHaveLength(0);
    calls(eventBusEmitSpy).toHaveLength(0);
  });
});
