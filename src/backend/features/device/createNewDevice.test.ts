import { createNewDevice } from './createNewDevice';
import { createUniqueDevice } from './createUniqueDevice';
import { saveDeviceToConfig } from './saveDeviceToConfig';

vi.mock('./createUniqueDevice');
vi.mock('./saveDeviceToConfig');

describe('createNewDevice', () => {
  const mockedCreateUniqueDevice = vi.mocked(createUniqueDevice);
  const mockedSaveDeviceToConfig = vi.mocked(saveDeviceToConfig);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return only error when creating a unique device fails', async () => {
    const error = new Error('Could not create device');
    mockedCreateUniqueDevice.mockResolvedValue({ error });

    const result = await createNewDevice({ key: 'key', platform: 'linux', hostname: 'host' });

    expect(result).toStrictEqual({ error });
    expect(mockedSaveDeviceToConfig).not.toHaveBeenCalled();
  });

  it('should save the device to config when creating the device succeeds', async () => {
    const device = {
      id: 1,
      uuid: 'device-uuid',
      name: 'Laptop',
      bucket: 'bucket-1',
      removed: false,
      hasBackups: true,
    };
    mockedCreateUniqueDevice.mockResolvedValue({ data: device });

    const result = await createNewDevice({ key: 'key', platform: 'linux', hostname: 'host' });

    expect(result).toStrictEqual({ data: device });
    expect(mockedSaveDeviceToConfig).toHaveBeenCalledWith(device);
  });
});
