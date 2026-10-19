import { render } from '@testing-library/react';
import { MailBridgeModule } from '@internxt/drive-desktop-core/build/frontend';
import { MailBridgeSection } from './mail-bridge-section';

vi.mock('@internxt/drive-desktop-core/build/frontend', () => ({
  MailBridgeModule: { useMailBridge: vi.fn(), MailBridgeView: vi.fn(() => null) },
}));
vi.mock('../../../context/LocalContext', () => ({ useTranslationContext: () => ({ language: 'en' }) }));

describe('MailBridgeSection', () => {
  const resync = vi.fn();

  beforeEach(() => {
    vi.mocked(MailBridgeModule.useMailBridge).mockReturnValue({
      viewModel: { status: 'stopped', error: null },
      accountEmail: 'user@inxt.me',
      isLoadingInitialStatus: false,
      isStartOnLoginEnabled: false,
      setStartOnLogin: vi.fn(),
      activate: vi.fn(),
      retry: vi.fn(),
      turnOff: vi.fn(),
      resync,
    });
  });

  it('supplies the Electron adapter to the shared hook', () => {
    render(<MailBridgeSection />);
    expect(MailBridgeModule.useMailBridge).toHaveBeenCalledWith(window.electron.mailBridge);
  });

  it.each([undefined, new Error('Resync unavailable')])(
    'adapts the shared resync Result for the view (%s)',
    async (error) => {
      resync.mockResolvedValue(error ? { error } : { data: undefined });
      render(<MailBridgeSection />);
      const props = vi.mocked(MailBridgeModule.MailBridgeView).mock.calls[0][0];
      expect(await props.onResync?.()).toStrictEqual({ data: undefined, error });
    },
  );

  it('keeps the view loading until the initial bridge state arrives', () => {
    const state = vi.mocked(MailBridgeModule.useMailBridge).getMockImplementation()?.(window.electron.mailBridge);
    if (!state) throw new Error('Missing test hook state');
    vi.mocked(MailBridgeModule.useMailBridge).mockReturnValue({ ...state, isLoadingInitialStatus: true });
    const { container } = render(<MailBridgeSection />);
    expect(container.querySelector('[aria-busy="true"]')).not.toBeNull();
    expect(MailBridgeModule.MailBridgeView).not.toHaveBeenCalled();
  });
});
