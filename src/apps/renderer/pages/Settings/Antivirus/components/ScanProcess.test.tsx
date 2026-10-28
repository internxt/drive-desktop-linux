import { render, screen, fireEvent } from '@testing-library/react';
import { ScanProcess } from './ScanProcess';
import { type Mock } from 'vitest';

interface ScanProcessProps {
  currentScanPath?: string;
  scannedProcess: number;
  stopScanProcess: Mock;
  translate: Mock;
}

describe('ScanProcess', () => {
  const defaultMockProps: ScanProcessProps = {
    currentScanPath: '/test/path/file.txt',
    scannedProcess: 50,
    stopScanProcess: vi.fn(),
    translate: vi.fn((key) => key),
  };

  let mockProps: ScanProcessProps;

  beforeEach(() => {
    vi.clearAllMocks();
    mockProps = { ...defaultMockProps };
  });

  it('renders the component with correct content', () => {
    render(<ScanProcess {...mockProps} />);

    expect(screen.getByText('settings.antivirus.scanProcess.scanning')).toBeInTheDocument();

    expect(screen.getByText('/test/path/file.txt')).toBeInTheDocument();

    expect(screen.getByText('50%')).toBeInTheDocument();

    expect(screen.getByText('settings.antivirus.scanOptions.stopScan')).toBeInTheDocument();

    expect(mockProps.translate).toHaveBeenCalledWith('settings.antivirus.scanProcess.scanning');
    expect(mockProps.translate).toHaveBeenCalledWith('settings.antivirus.scanOptions.stopScan');
  });

  it('calls stopScanProcess when stop button is clicked', () => {
    render(<ScanProcess {...mockProps} />);

    const stopButton = screen.getByText('settings.antivirus.scanOptions.stopScan');
    fireEvent.click(stopButton);

    expect(mockProps.stopScanProcess).toHaveBeenCalledTimes(1);
  });

  it('renders the progress bar with correct width', () => {
    const { container } = render(<ScanProcess {...mockProps} />);

    const progressBar = container.querySelector('.bg-primary');
    expect(progressBar).toHaveStyle('width: 50%');

    mockProps.scannedProcess = 75;
    const { container: newContainer } = render(<ScanProcess {...mockProps} />);

    const updatedProgressBar = newContainer.querySelector('.bg-primary');
    expect(updatedProgressBar).toHaveStyle('width: 75%');
  });

  it('shows a counting message before a file path is available', () => {
    render(<ScanProcess {...mockProps} currentScanPath={undefined} scannedProcess={0} />);

    expect(screen.getByText('settings.antivirus.scanProcess.counting')).toBeInTheDocument();
    expect(screen.getByText('settings.antivirus.scanProcess.countingDetail')).toBeInTheDocument();
    expect(screen.queryByText('0%')).not.toBeInTheDocument();
    const countingProgress = screen.getByTestId('counting-progress');
    expect(countingProgress).toHaveClass('w-full', 'bg-primary');
    expect(countingProgress).toHaveStyle({ backgroundSize: '1rem 1rem' });
  });

  it('applies the correct styling', () => {
    const { container: domContainer } = render(<ScanProcess {...mockProps} />);

    const componentContainer = screen.getByTestId('scan-process-container');
    expect(componentContainer).toHaveClass('flex w-full flex-col items-center gap-4');

    const progressContainer = domContainer.querySelector('.flex.w-full.flex-col.items-center.gap-1');
    expect(progressContainer).toHaveClass('flex w-full flex-col items-center gap-1');

    const progressBarBg = domContainer.querySelector('.bg-primary\\/10');
    expect(progressBarBg).toHaveClass('relative h-1.5 w-full overflow-hidden rounded-full bg-primary/10');
  });
});
