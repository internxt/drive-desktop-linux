import Button from '../../../../components/Button';
import { X } from '@phosphor-icons/react';
import Illustration from '../../../../assets/backups/Illustration.svg';
import { useDiscoverBackups } from '../../../../hooks/backups/useDiscoverBackups';
import { useTranslationContext } from '../../../../context/LocalContext';

export function DiscoverBackups() {
  const { hasDiscovered, discover } = useDiscoverBackups();

  if (hasDiscovered) {
    return <></>;
  }

  const openBackupsSettings = () => window.electron.openSettingsWindow('BACKUPS');

  const { translate } = useTranslationContext();

  return (
    <div className="m-3 grid grid-cols-2 gap-3 rounded-lg border border-gray-30 bg-gray-5 p-4">
      <figure className="-m-4 mr-0">
        <Illustration />
      </figure>
      <div className="flex flex-col">
        <div className="flex flex-row">
          <div>
            <div className="text-neutral-500 text-sm font-semibold">
              {translate('widget.banners.discover-backups.title')}
            </div>
            <div className="mb-4 mt-1 text-xs">{translate('widget.banners.discover-backups.body')}</div>
          </div>
          <button
            onClick={discover}
            className="ml-2 shrink-0 self-start rounded-md p-1 text-gray-50 transition-colors hover:bg-black/5 hover:text-gray-80"
            aria-label="Dismiss">
            <X size={16} />
          </button>
        </div>
        <Button size="sm" className="mt-auto" onClick={openBackupsSettings}>
          <span className="text-xs">{translate('widget.banners.discover-backups.action')}</span>
        </Button>
      </div>
    </div>
  );
}
