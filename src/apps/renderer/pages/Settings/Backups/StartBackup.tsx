import { useContext, useState } from 'react';
import Button from '../../../components/Button';
import { useTranslationContext } from '../../../context/LocalContext';
import { BackupContext } from '../../../context/BackupContext';
import { ConfirmationModal } from '../../../components/Backups/Delete/ConfirmationModal';

type StartBackupProps = {
  className: string;
};

export function StartBackup({ className }: StartBackupProps) {
  const { backups, backupStatus, isBackupAvailable } =
    useContext(BackupContext);

  const { translate } = useTranslationContext();
  const [showAvailabilityAlert, setShowAvailabilityAlert] = useState(false);

  return (
    <>
      <Button
        className={`${className} hover:cursor-pointer`}
        variant={backupStatus === 'STANDBY' ? 'primary' : 'danger'}
        size="md"
        onClick={() => {
          if (!isBackupAvailable) {
            setShowAvailabilityAlert(true);
            return;
          }

          backupStatus === 'STANDBY'
            ? window.electron.startBackupsProcess()
            : window.electron.stopBackupsProcess();
        }}
        disabled={backups.length === 0}
      >
        {translate(
          `settings.backups.action.${
            backupStatus === 'STANDBY' ? 'start' : 'stop'
          }`
        )}
      </Button>
      <ConfirmationModal
        show={showAvailabilityAlert}
        onCanceled={() => setShowAvailabilityAlert(false)}
        onConfirmed={async () => {
          await window.electron.openUrl('https://internxt.com/pricing');
          setShowAvailabilityAlert(false);
        }}
        title={translate('settings.antivirus.featureLocked.title')}
        explanation={translate('settings.antivirus.featureLocked.subtitle')}
        cancelText={translate('common.cancel')}
        confirmText={translate('settings.antivirus.featureLocked.action')}
        variantButton="primary"
      />
    </>
  );
}
