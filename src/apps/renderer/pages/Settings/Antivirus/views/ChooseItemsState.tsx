import { useState } from 'react';
import { useTranslationContext } from '../../../../context/LocalContext';
import Button from '../../../../components/Button';
import { useAntivirusContext } from '../../../../context/AntivirusContext';
import { CustomScanItemsSelectorDropdown } from '../components/CustomScanItemsSelectorDropdown';
import { ActionDialog } from '../components/ActionDialog';

export const ChooseItemsState = () => {
  const { translate } = useTranslationContext();
  const [showDisableDialog, setShowDisableDialog] = useState(false);
  const {
    isAntivirusAvailable,
    isAntivirusEnabled,
    isUpdatingAntivirusEnabled,
    onSetBackgroundScanEnabled,
    onCustomScanButtonClicked,
    onScanUserSystemButtonClicked,
  } = useAntivirusContext();

  const onToggleProtection = async () => {
    if (isUpdatingAntivirusEnabled) {
      return;
    }

    if (isAntivirusEnabled) {
      setShowDisableDialog(true);
      return;
    }

    await onSetBackgroundScanEnabled(true);
  };

  return (
    <div className="flex flex-col gap-4 p-10" data-testid="choose-items-container">
      <div className="mb-2 flex w-full flex-row items-center justify-between border-b border-gray-10 pb-4">
        <div className="flex items-center gap-2">
          <p className="font-medium text-gray-80">{translate('settings.antivirus.realtimeProtection.title')}</p>
          <div className="group relative">
            <button
              type="button"
              className="flex h-4 w-4 items-center justify-center rounded-full border border-gray-40 bg-surface text-[10px] text-gray-60 dark:border-gray-30 dark:bg-gray-5 dark:text-gray-40"
              aria-label={translate('settings.antivirus.realtimeProtection.infoAriaLabel')}>
              i
            </button>
            <div className="pointer-events-none absolute left-1/2 top-6 z-10 hidden w-64 -translate-x-1/2 rounded-md border border-gray-80/10 bg-gray-100 px-3 py-2 text-xs text-white shadow-md group-hover:block dark:border-gray-30 dark:bg-gray-5 dark:text-gray-80">
              {translate('settings.antivirus.realtimeProtection.tooltip')}
            </div>
          </div>
        </div>

        <button
          type="button"
          role="switch"
          aria-checked={isAntivirusEnabled}
          disabled={isUpdatingAntivirusEnabled || !isAntivirusAvailable}
          onClick={() => {
            void onToggleProtection();
          }}
          className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${
            isAntivirusEnabled ? 'bg-primary' : 'bg-gray-20'
          } ${isUpdatingAntivirusEnabled || !isAntivirusAvailable ? 'cursor-not-allowed opacity-60' : ''}`}>
          <span
            className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
              isAntivirusEnabled ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
      </div>

      <div
        className="flex w-full flex-row items-center justify-between rounded-lg border border-gray-10 bg-surface px-4 py-3"
        data-testid="scan-option-container">
        <p className="font-medium text-gray-80">{translate('settings.antivirus.scanOptions.systemScan.text')}</p>
        <Button onClick={onScanUserSystemButtonClicked} disabled={!isAntivirusAvailable}>
          {translate('settings.antivirus.scanOptions.systemScan.action')}
        </Button>
      </div>

      <div
        className="flex w-full flex-row items-center justify-between rounded-lg border border-gray-10 bg-surface px-4 py-3"
        data-testid="scan-option-container">
        <p className="font-medium text-gray-80">{translate('settings.antivirus.scanOptions.customScan.text')}</p>
        <CustomScanItemsSelectorDropdown
          translate={translate}
          disabled={!isAntivirusAvailable}
          onScanItemsButtonClicked={onCustomScanButtonClicked}
        />
      </div>

      <ActionDialog
        title={translate('settings.antivirus.realtimeProtection.disableDialog.title')}
        showDialog={showDisableDialog}
        cancelText={translate('settings.antivirus.realtimeProtection.disableDialog.cancel')}
        confirmText={translate('settings.antivirus.realtimeProtection.disableDialog.confirm')}
        confirmButtonVariant="primary"
        onCancel={() => setShowDisableDialog(false)}
        onConfirm={() => {
          void onSetBackgroundScanEnabled(false);
          setShowDisableDialog(false);
        }}>
        <p className="text-sm text-gray-80">
          {translate('settings.antivirus.realtimeProtection.disableDialog.description')}
        </p>
        <p className="text-sm text-gray-80">
          {translate('settings.antivirus.realtimeProtection.disableDialog.secondary')}
        </p>
      </ActionDialog>
    </div>
  );
};
