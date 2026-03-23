import { render, screen } from '@testing-library/react';
import { OnboardingCompletedSlide } from './onboarding-completed-slide';
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

describe('OnboardingCompletedSlide', () => {
  it('should render the title', () => {
    render(<OnboardingCompletedSlide {...defaultProps} />);

    expect(screen.getByText('onboarding.slides.onboarding-completed.title')).toBeInTheDocument();
  });

  it('should render the desktop-ready section title', () => {
    render(<OnboardingCompletedSlide {...defaultProps} />);

    expect(screen.getByText('onboarding.slides.onboarding-completed.desktop-ready.title')).toBeInTheDocument();
  });

  it('should render the desktop-ready description', () => {
    render(<OnboardingCompletedSlide {...defaultProps} />);

    expect(screen.getByText('onboarding.slides.onboarding-completed.desktop-ready.description')).toBeInTheDocument();
  });

  it('should render the check circle icon', () => {
    const { container } = render(<OnboardingCompletedSlide {...defaultProps} />);

    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });
});
