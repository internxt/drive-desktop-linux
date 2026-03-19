import { act, render, screen, fireEvent } from '@testing-library/react';
import { UpdateAvailable } from './UpdateAvailable';

describe('UpdateAvailable', () => {
  beforeEach(() => {
    vi.mocked(window.electron.getUpdateStatus).mockResolvedValue(null);
  });

  it('renders nothing when no update is available', () => {
    vi.mocked(window.electron.onUpdateAvailable).mockReturnValue(vi.fn());

    const { container } = render(<UpdateAvailable />);

    expect(container).toBeEmptyDOMElement();
  });

  it('renders the banner when an update is available', () => {
    vi.mocked(window.electron.onUpdateAvailable).mockImplementation((callback) => {
      callback({ version: '2.6.0' });
      return vi.fn();
    });

    render(<UpdateAvailable />);

    expect(screen.getByText('widget.banners.update-available.body')).toBeInTheDocument();
    expect(screen.getByText('widget.banners.update-available.action')).toBeInTheDocument();
  });

  it('opens the download page when the action link is clicked', () => {
    vi.mocked(window.electron.onUpdateAvailable).mockImplementation((callback) => {
      callback({ version: '2.6.0' });
      return vi.fn();
    });

    render(<UpdateAvailable />);

    fireEvent.click(screen.getByText('widget.banners.update-available.action'));

    expect(window.electron.openUrl).toBeCalledWith('https://github.com/internxt/drive-desktop-linux/releases/');
  });

  it('dismisses the banner when the X button is clicked', () => {
    vi.mocked(window.electron.onUpdateAvailable).mockImplementation((callback) => {
      callback({ version: '2.6.0' });
      return vi.fn();
    });

    render(<UpdateAvailable />);

    expect(screen.getByText('widget.banners.update-available.body')).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText('Dismiss'));

    expect(screen.queryByText('widget.banners.update-available.body')).not.toBeInTheDocument();
  });

  it('calls the cleanup function on unmount', () => {
    const unsubscribe = vi.fn();
    vi.mocked(window.electron.onUpdateAvailable).mockReturnValue(unsubscribe);

    const { unmount } = render(<UpdateAvailable />);
    unmount();

    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });

  it('shows the banner when update-available event fires after mount', () => {
    let capturedCallback: ((info: { version: string }) => void) | null = null;

    vi.mocked(window.electron.onUpdateAvailable).mockImplementation((callback) => {
      capturedCallback = callback;
      return vi.fn();
    });

    render(<UpdateAvailable />);

    expect(screen.queryByText('widget.banners.update-available.body')).not.toBeInTheDocument();

    act(() => {
      capturedCallback!({ version: '3.0.0' });
    });

    expect(screen.getByText('widget.banners.update-available.body')).toBeInTheDocument();
  });
});
