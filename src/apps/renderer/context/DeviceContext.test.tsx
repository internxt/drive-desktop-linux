import { act, renderHook } from '@testing-library/react-hooks';
import { useContext } from 'react';
import { DeviceContext, DeviceProvider } from './DeviceContext';
import { partialSpyOn } from '../../../../tests/vitest/utils.helper';
import { Device } from '../../../backend/features/backup/types/Device';

describe('DeviceContext', () => {
  void window.electron.getOrCreateDevice;
  void window.electron.onDeviceCreated;
  void window.electron.devices.getDevices;

  const getOrCreateDeviceMock = partialSpyOn(window.electron, 'getOrCreateDevice', false);
  const onDeviceCreatedMock = partialSpyOn(window.electron, 'onDeviceCreated', false);
  const getDevicesMock = partialSpyOn(window.electron.devices, 'getDevices', false);
  const unsubscribeMock = vi.fn();

  const device: Device = {
    id: 1,
    uuid: 'device-uuid',
    name: 'Linux Device',
    bucket: 'bucket',
    removed: false,
    hasBackups: false,
  };

  function renderDeviceContextHook() {
    return renderHook(() => useContext(DeviceContext), {
      wrapper: ({ children }) => <DeviceProvider>{children}</DeviceProvider>,
    });
  }

  beforeEach(() => {
    getDevicesMock.mockResolvedValue([]);
    onDeviceCreatedMock.mockReturnValue(unsubscribeMock);
  });

  it('should keep success state when device-created event arrives before getOrCreateDevice error', async () => {
    let onDeviceCreatedCallback: ((value: Device) => void) | undefined;

    onDeviceCreatedMock.mockImplementation((callback) => {
      onDeviceCreatedCallback = callback;
      return unsubscribeMock;
    });

    getOrCreateDeviceMock.mockImplementation(async () => {
      onDeviceCreatedCallback?.(device);
      return { error: new Error('transient-get-or-create-failure') };
    });

    const { result } = renderDeviceContextHook();

    await vi.waitFor(() => {
      expect(result.current.deviceState.status).toBe('SUCCESS');
    });

    if (result.current.deviceState.status === 'SUCCESS') {
      expect(result.current.deviceState.device).toStrictEqual(device);
    }
  });

  it('should set error state when getOrCreateDevice fails and no device-created event is received', async () => {
    getOrCreateDeviceMock.mockResolvedValue({ error: new Error('failed') });

    const { result } = renderDeviceContextHook();

    await vi.waitFor(() => {
      expect(result.current.deviceState.status).toBe('ERROR');
    });
  });

  it('should unsubscribe from device-created event on unmount', async () => {
    getOrCreateDeviceMock.mockResolvedValue({ data: device });

    const { unmount } = renderDeviceContextHook();

    await act(async () => {
      unmount();
    });

    expect(unsubscribeMock).toHaveBeenCalledOnce();
  });
});
