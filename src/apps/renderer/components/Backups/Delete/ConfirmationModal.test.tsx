import { fireEvent, render, screen } from '@testing-library/react';
import { ConfirmationModal } from './ConfirmationModal';

vi.mock('../../../context/LocalContext', () => ({
  useTranslationContext: () => ({ translate: (key: string) => key }),
}));

describe('ConfirmationModal', () => {
  const onConfirmed = vi.fn();
  const onCanceled = vi.fn();

  beforeEach(() => {
    onConfirmed.mockReset();
    onCanceled.mockReset();
  });

  it('should keep the dialog above the overlay so the confirm button can be clicked', () => {
    render(
      <ConfirmationModal
        show
        onConfirmed={onConfirmed}
        onCanceled={onCanceled}
        title="Delete backups"
        confirmText="Delete"
        cancelText="Cancel"
      />,
    );

    const panel = document.querySelector('.relative.z-10');
    const overlay = document.querySelector('.fixed.inset-0');

    expect(panel).toBeInTheDocument();
    expect(overlay).toBeInTheDocument();
    if (!panel || !overlay) {
      throw new Error('dialog layers missing');
    }
    expect(panel.compareDocumentPosition(overlay) & Node.DOCUMENT_POSITION_PRECEDING).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));

    expect(onConfirmed).toHaveBeenCalledTimes(1);
    expect(onCanceled).not.toHaveBeenCalled();
  });
});
