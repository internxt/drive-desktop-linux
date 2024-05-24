import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { DevicesSideBar } from './DevicesSideBar';
import { DeviceSettings } from './DeviceSettings';

dayjs.extend(relativeTime);

export default function BackupsSetting({
  onGoToList,
}: {
  onGoToList: () => void;
}) {
  return (
    <section className="flex h-full">
      <DevicesSideBar className="w-1/3" />
      <div className="mx-2 border-l border-gray-10"></div>
      <DeviceSettings className="w-2/3" onGoToList={onGoToList} />
    </section>
  );
}
