import { useEffect, useState } from 'react';
import { useTranslationContext } from '../../../../context/LocalContext';
import { Info, X } from '@phosphor-icons/react';

export function UpdateAvailable() {
  const [updateInfo, setUpdateInfo] = useState<{ version: string } | null>(null);
  const { translate } = useTranslationContext();
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    window.electron.getUpdateStatus().then((info) => {
      if (info) setUpdateInfo(info);
    });

    const unsubscribe = window.electron.onUpdateAvailable((info) => {
      setUpdateInfo(info);
    });

    return unsubscribe;
  }, []);

  if (!updateInfo || dismissed) {
    return <></>;
  }

  const openDownloadPage = () => window.electron.openUrl('https://github.com/internxt/drive-desktop-linux/releases/');

  return (
    <div className="mx-3 mt-3 flex items-center gap-2.5 rounded-xl border border-primary/30 bg-primary/10 px-4 py-2 dark:bg-primary/20">
      <Info size={16} weight="fill" className="shrink-0 text-primary" />
      <div className="flex flex-1 flex-col">
        <p className="text-xs text-gray-80">{translate('widget.banners.update-available.body')}</p>
        <button
          onClick={openDownloadPage}
          className="self-start text-xs font-medium text-primary underline-offset-2 hover:underline">
          {translate('widget.banners.update-available.action')}
        </button>
      </div>
      <button
        onClick={() => setDismissed(true)}
        className="shrink-0 text-gray-50 hover:text-gray-80"
        aria-label="Dismiss">
        <X size={14} />
      </button>
    </div>
  );
}
