import { render, screen } from '@testing-library/react';
import { WelcomeSlide } from './welcome-slide';

vi.mock('../../../hooks/useTheme', () => ({
  useTheme: () => ({ theme: 'light' }),
}));

describe('WelcomeSlide', () => {
  it('should render the title', () => {
    render(<WelcomeSlide />);

    expect(screen.getByText('onboarding.slides.welcome.title')).toBeInTheDocument();
  });

  it('should render the description', () => {
    render(<WelcomeSlide />);

    expect(screen.getByText('onboarding.slides.welcome.description')).toBeInTheDocument();
  });
});
