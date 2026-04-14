import { Device } from '../../../apps/main/device/service';
import { Result } from '../../../context/shared/domain/Result';
import { createUniqueDevice } from './createUniqueDevice';
import { saveDeviceToConfig } from './saveDeviceToConfig';
import { DeviceIdentifierDTO } from './device.types';

export async function createNewDevice(deviceIdentifier: DeviceIdentifierDTO): Promise<Result<Device, Error>> {
  const { data: device, error } = await createUniqueDevice(deviceIdentifier);
  if (error) return { error };

  saveDeviceToConfig(device);
  return { data: device };
}
