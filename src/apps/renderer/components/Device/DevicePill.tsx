import { Device } from '../../../main/device/service';
import { Pill } from '../Pill';

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

interface DetailedDevicePillProps {
  device: Device;
  lastUpdated: number;
  size: number;
}

export function DetailedDevicePill({
  device,
  lastUpdated,
  size,
}: DetailedDevicePillProps) {
  return (
    <div className=" dark:bg-gray-5flex flex w-full rounded-lg border border-gray-10 bg-surface px-6 py-4 shadow-sm">
      <div className="grow">
        {device.name}
        {lastUpdated ?? lastUpdated}
      </div>
      <Pill value={size} />
    </div>
  );
}
