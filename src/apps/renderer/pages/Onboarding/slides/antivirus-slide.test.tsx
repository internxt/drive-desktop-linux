import { render, screen } from '@testing-library/react';
import { AntivirusSlide } from './antivirus-slide';
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

describe('AntivirusSlide', () => {
  it('should render the title', () => {
    render(<AntivirusSlide {...defaultProps} />);

    expect(screen.getByText('onboarding.slides.antivirus.title')).toBeInTheDocument();
  });

  it('should render the "new" badge', () => {
    render(<AntivirusSlide {...defaultProps} />);

    expect(screen.getByText('onboarding.common.new')).toBeInTheDocument();
  });

  it('should render the description', () => {
    render(<AntivirusSlide {...defaultProps} />);

    expect(screen.getByText('onboarding.slides.antivirus.description')).toBeInTheDocument();
  });
});
