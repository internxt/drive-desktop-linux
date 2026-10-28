import { logger } from '@internxt/drive-desktop-core/build/backend';
import { partialSpyOn } from '../../../../tests/vitest/utils.helper';
import { Antivirus } from './Antivirus';
import { ScanOrchestrator } from './ScanOrchestrator';
import * as getFilesFromDirectoryModule from './utils/getFilesFromDirectory';
import * as transformItemModule from './utils/transformItem';

const { dbConnection } = vi.hoisted(() => ({
  dbConnection: {
    getItemFromDatabase: vi.fn(),
    addItemToDatabase: vi.fn(),
  },
}));

vi.mock('./db/DBScannerConnection', () => ({
  DBScannerConnection: vi.fn(function DBScannerConnectionMock() {
    return dbConnection;
  }),
}));

describe('ScanOrchestrator', () => {
  const createInstanceMock = partialSpyOn(Antivirus, 'createInstance');
  const countSystemFilesMock = partialSpyOn(getFilesFromDirectoryModule, 'countSystemFiles');
  const getFilesFromDirectoryMock = partialSpyOn(getFilesFromDirectoryModule, 'getFilesFromDirectory');
  const transformItemMock = partialSpyOn(transformItemModule, 'transformItem');

  const antivirus = {
    scanFileWithRetry: vi.fn(),
    stopClamAv: vi.fn(),
  };

  beforeEach(() => {
    createInstanceMock.mockResolvedValue(antivirus as unknown as Antivirus);
    antivirus.scanFileWithRetry.mockResolvedValue({ file: '/file', isInfected: false, viruses: [] });
    antivirus.stopClamAv.mockResolvedValue(undefined);
    countSystemFilesMock.mockResolvedValue(1);
    dbConnection.getItemFromDatabase.mockResolvedValue(null);
    dbConnection.addItemToDatabase.mockResolvedValue(true);
    getFilesFromDirectoryMock.mockImplementation(async ({ cb }) => {
      await cb('/home/dev/.cache/google-chrome/Default/Cache/Cache_Data/018b8d02b95071f9_0');
    });
  });

  it('should stop a file scan that is cancelled while the file is being prepared', async () => {
    const orchestrator = new ScanOrchestrator();
    const filePath = '/home/dev/.cache/google-chrome/Default/Cache/Cache_Data/018b8d02b95071f9_0';

    transformItemMock.mockImplementation(async () => {
      await orchestrator.cancel();

      return {
        id: 'item-id',
        type: '',
        size: 1,
        hash: 'hash',
        createdAt: '2026-10-26T00:00:00.000Z',
        updatedAt: '2026-10-26T00:00:00.000Z',
        creationTimeW: '2026-10-26T00:00:00.000Z',
        updatedAtW: '2026-10-26T00:00:00.000Z',
        pathName: filePath,
        status: 'scanned',
        isInfected: false,
      };
    });

    await orchestrator.scanPaths(['/home/dev/.cache']);

    expect(antivirus.scanFileWithRetry).not.toHaveBeenCalled();
    expect(logger.error).not.toHaveBeenCalledWith(
      expect.objectContaining({
        msg: expect.stringContaining('Error scanning file'),
      }),
    );
  });
});
