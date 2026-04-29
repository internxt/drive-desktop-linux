import { driveServerModule } from '../../../infra/drive-server/drive-server.module';
import { getDeviceIdentifier } from './getDeviceIdentifier';
import { renameDevice } from './renameDevice';

vi.mock('./getDeviceIdentifier');
vi.mock('../../../infra/drive-server/drive-server.module', () => ({
  driveServerModule: {
    backup: {
      updateDeviceByIdentifier: vi.fn(),
    },
  },
}));

describe('renameDevice', () => {
  const mockedGetDeviceIdentifier = vi.mocked(getDeviceIdentifier);
  const mockedUpdateDeviceByIdentifier = vi.mocked(driveServerModule.backup.updateDeviceByIdentifier);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return only error when the device identifier is unavailable', async () => {
    const error = new Error('No device identifier');
    mockedGetDeviceIdentifier.mockReturnValue({ error });

    const result = await renameDevice('new-name');

    expect(result.error).toBe(error);
    expect(result.data).toBeUndefined();
    expect(mockedUpdateDeviceByIdentifier).not.toHaveBeenCalled();
  });

  it('should return only data when the rename succeeds', async () => {
    const device = { uuid: 'uuid-1', name: 'new-name', bucket: 'bucket-1' };
    mockedGetDeviceIdentifier.mockReturnValue({
      data: { key: 'device-key', platform: 'linux', hostname: 'host' },
    });
    mockedUpdateDeviceByIdentifier.mockResolvedValue({
      isRight: () => true,
      isLeft: () => false,
      getRight: () => device,
      getLeft: () => undefined,
    } as never);

    const result = await renameDevice('new-name');

    expect(result).toStrictEqual({ data: device });
  });

  it('should return only error when the rename request fails', async () => {
    const error = new Error('Rename failed');
    mockedGetDeviceIdentifier.mockReturnValue({
      data: { key: 'device-key', platform: 'linux', hostname: 'host' },
    });
    mockedUpdateDeviceByIdentifier.mockResolvedValue({
      isRight: () => false,
      isLeft: () => true,
      getRight: () => undefined,
      getLeft: () => error,
    } as never);

    const result = await renameDevice('new-name');

    expect(result.error).toBe(error);
    expect(result.data).toBeUndefined();
  });
});
