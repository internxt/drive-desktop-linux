import { render, screen } from '@testing-library/react';
import { DriveSlide } from './drive-slide';
import { OnboardingSlideProps } from '../helpers';

vi.mock('../../../hooks/useTheme', () => ({
  useTheme: () => ({ theme: 'light' }),
}));

const defaultProps: OnboardingSlideProps = {
  onGoNextSlide: vi.fn(),
  onSkipOnboarding: vi.fn(),
  onSetupBackups: vi.fn(),
  onFinish: vi.fn(),
  backupFolders: [],
  currentSlide: 0,
  totalSlides: 6,
  platform: 'linux',
};

describe('DriveSlide', () => {
  it('should render the title', () => {
    render(<DriveSlide {...defaultProps} />);

    expect(screen.getByText('onboarding.slides.drive.title')).toBeInTheDocument();
  });

  it('should render the description with platform interpolation', () => {
    render(<DriveSlide {...defaultProps} />);

    expect(screen.getByText('onboarding.slides.drive.description')).toBeInTheDocument();
  });
});
