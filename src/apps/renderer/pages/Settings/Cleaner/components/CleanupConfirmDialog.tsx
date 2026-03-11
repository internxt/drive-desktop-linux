import { X } from '@phosphor-icons/react';
import Button from '../../../../../renderer/components/Button';
import { useTranslationContext } from '../../../../context/LocalContext';

interface CleanupConfirmDialogProps {
  isVisible: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function CleanupConfirmDialog({ isVisible, onConfirm, onCancel }: CleanupConfirmDialogProps) {
  if (!isVisible) return null;
  const { translate } = useTranslationContext();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black bg-opacity-30" onClick={onCancel} />

      {/* Dialog */}
      <div className="dark:bg-gray-800 relative flex h-[200px] w-[350px] flex-col gap-5 rounded-xl bg-surface p-5 pt-3 shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <h3 className="text-gray-900 text-lg font-semibold dark:text-gray-100">
              {translate('settings.cleaner.cleanupConfirmDialogView.title')}
            </h3>
          </div>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 flex items-center justify-center text-2xl transition-colors">
            <X />
          </button>
        </div>

        {/* Content */}
        <div>
          <p className="text-md font-normal leading-5 tracking-tight text-gray-60">
            {translate('settings.cleaner.cleanupConfirmDialogView.description')}
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <Button className="flex-1" variant={'primaryLight'} size="lg" onClick={onCancel}>
            {translate('settings.cleaner.cleanupConfirmDialogView.cancelButton')}
          </Button>
          <Button className="flex-1" variant={'primary'} size="lg" onClick={onConfirm}>
            {translate('settings.cleaner.cleanupConfirmDialogView.confirmButton')}
          </Button>
        </div>
      </div>
    </div>
  );
}
