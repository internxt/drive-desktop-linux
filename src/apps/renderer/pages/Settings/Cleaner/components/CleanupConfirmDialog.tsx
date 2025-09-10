import { X } from '@phosphor-icons/react';
import Button from '../../../../../renderer/components/Button';

interface CleanupConfirmDialogProps {
  isVisible: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function CleanupConfirmDialog({
  isVisible,
  onConfirm,
  onCancel,
}: CleanupConfirmDialogProps) {
  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black bg-opacity-50 backdrop-blur-sm"
        onClick={onCancel}
      />

      {/* Dialog */}
      <div className="dark:bg-gray-800 relative mx-4 w-full max-w-md rounded-lg bg-surface p-6 shadow-xl">
        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <h3 className="text-gray-900 text-lg font-semibold dark:text-gray-100">
              Confirm cleanup
            </h3>
          </div>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <X />
          </button>
        </div>

        {/* Content */}
        <div className="mb-6">
          <p className="text-gray-600 dark:text-gray-300">
            This action will permanently delete the selected files from your
            device. This cannot be undone. Please, confirm to continue.
          </p>
        </div>

        {/* Actions */}
        <div className="flex justify-end space-x-3">
          <Button
            variant={'primaryLight'}
            size="lg"
            onClick={onCancel}
          >
            Cancel
          </Button>
          <Button
            variant={'primary'}
            size="lg"
            onClick={onConfirm}
          >
            Delete files
          </Button>
        </div>
      </div>
    </div>
  );
}
