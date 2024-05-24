import { useContext } from 'react';
import { DeviceContext } from '../../../context/DeviceContext';
import { Question } from '@phosphor-icons/react';
import { DevicePill } from '../../../components/Device/DevicePill';
import { useDevices } from '../../../hooks/devices/useDevices';

function Help() {
  return (
    <>
      <Question className="mr-1 inline" />
      <span className="text-gray-100">Backups help</span>
    </>
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
      <h1>Devices</h1>
      <ul>
        {devices.map((device) => (
          <li className="my-1">
            {<DevicePill device={device} current={isCurrent(device.id)} />}
          </li>
        ))}
      </ul>
      <Help />
    </aside>
  );
}
