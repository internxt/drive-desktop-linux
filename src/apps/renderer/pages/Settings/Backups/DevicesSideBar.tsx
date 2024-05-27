import { useContext } from 'react';
import { DeviceContext } from '../../../context/DeviceContext';
import { Question } from '@phosphor-icons/react';
import { useDevices } from '../../../hooks/devices/useDevices';
import { Device } from '../../../../main/device/service';

interface DevicePillProps {
  device: Device;
  current: boolean;
}

export function DevicePill({ device, current }: DevicePillProps) {
  const borderStyle = current
    ? 'rounded-lg border border-gray-10 bg-surface shadow-sm dark:bg-gray-5'
    : '';

  const styles = `${borderStyle} flex flex-col px-3 py-2 `;

  return (
    <div className={styles}>
      {current && <div className="text-blue-800 text-xs">This device</div>}
      {device.name}
    </div>
  );
}

function Help() {
  const handleOpenURL = async () => {
    try {
      await window.electron.openUrl(
        'https://help.internxt.com/en/articles/6583477-how-do-backups-work-on-internxt-drive'
      );
    } catch (error) {
      reportError(error);
    }
  };

  return (
    <div className="mt-auto hover:cursor-pointer" onClick={handleOpenURL}>
      <Question className="mr-1 inline" />
      <span className="text-gray-100">Backups help</span>
    </div>
  );
}

type DevicesSideBarProps = React.HTMLAttributes<HTMLBaseElement>;

export function DevicesSideBar({ className }: DevicesSideBarProps) {
  const [state] = useContext(DeviceContext);
  const { devices } = useDevices();

  function isCurrent(id: number) {
    return state.status === 'SUCCESS' && state.device.id === id;
  }

  return (
    <aside className={className}>
      <div className="flex h-full flex-col">
        <h1>Devices</h1>
        <ul>
          {devices.map((device) => (
            <li className="my-1" key={device.id}>
              {<DevicePill device={device} current={isCurrent(device.id)} />}
            </li>
          ))}
        </ul>
        <Help />
      </div>
    </aside>
  );
}
