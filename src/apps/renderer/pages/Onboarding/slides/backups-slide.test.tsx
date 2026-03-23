import { render, screen } from '@testing-library/react';
import { BackupsSlide } from './backups-slide';
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

describe('BackupsSlide', () => {
  it('should render the title', () => {
    render(<BackupsSlide {...defaultProps} />);

    expect(screen.getByText('onboarding.slides.backups.title')).toBeInTheDocument();
  });

  it('should render the description', () => {
    render(<BackupsSlide {...defaultProps} />);

    expect(screen.getByText('onboarding.slides.backups.description')).toBeInTheDocument();
  });
});
