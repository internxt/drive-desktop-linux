import {
  createContext,
  Dispatch,
  ReactNode,
  SetStateAction,
  useEffect,
  useState,
} from 'react';
import { Device } from '../../main/device/service';

type DeviceState =
  | { status: 'LOADING' | 'ERROR' }
  | { status: 'SUCCESS'; device: Device };

const defaultState = { status: 'LOADING' } as const;

interface DeviceContextProps {
  deviceState: DeviceState;
  deviceRename: (deviceName: string) => Promise<void>;
  selected: Device | undefined;
  setSelected: Dispatch<SetStateAction<Device | undefined>>;
  current: Device | undefined;
  setCurrent: Dispatch<SetStateAction<Device | undefined>>;
}

export const DeviceContext = createContext<DeviceContextProps>(
  {} as DeviceContextProps
);

export function DeviceProvider({ children }: { children: ReactNode }) {
  const [deviceState, setDeviceState] = useState<DeviceState>(defaultState);
  const [current, setCurrent] = useState<Device>();
  const [selected, setSelected] = useState<Device>();

  useEffect(() => {
    refreshDevice();

    const removeDeviceCreatedListener =
      window.electron.onDeviceCreated(setCurrentDevice);
    return () => {
      removeDeviceCreatedListener();
    };
  }, []);

  const refreshDevice = () => {
    setDeviceState({ status: 'LOADING' });
    window.electron
      .getOrCreateDevice()
      .then((device) => {
        setCurrentDevice(device);
      })
      .catch(() => {
        setDeviceState({ status: 'ERROR' });
      });
  };

  const setCurrentDevice = (newDevice: Device) => {
    try {
      setDeviceState({ status: 'SUCCESS', device: newDevice });
      setCurrent(newDevice);
      setSelected(newDevice);
    } catch {
      setDeviceState({ status: 'ERROR' });
    }
  };

  const deviceRename = async (deviceName: string) => {
    setDeviceState({ status: 'LOADING' });

    try {
      const updatedDevice = await window.electron.renameDevice(deviceName);
      setDeviceState({ status: 'SUCCESS', device: updatedDevice });
      setCurrent(updatedDevice);
      setSelected(updatedDevice);
    } catch (err) {
      console.log(err);
      setDeviceState({ status: 'ERROR' });
    }
  };

  return (
    <DeviceContext.Provider
      value={{
        deviceState,
        deviceRename,
        current,
        setCurrent,
        selected,
        setSelected,
      }}
    >
      {children}
    </DeviceContext.Provider>
  );
}
