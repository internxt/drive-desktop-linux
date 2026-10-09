import { render, screen } from '@testing-library/react';
import { WelcomeSlide } from './welcome-slide';
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
};

describe('WelcomeSlide', () => {
  it('should render the title', () => {
    render(<WelcomeSlide {...defaultProps} />);

    expect(screen.getByText('onboarding.slides.welcome.title')).toBeInTheDocument();
  });

  it('should render the description', () => {
    render(<WelcomeSlide {...defaultProps} />);

    expect(screen.getByText('onboarding.slides.welcome.description')).toBeInTheDocument();
  });
});
