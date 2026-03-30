import { render, screen } from '@testing-library/react';
import { CleanerSlide } from './cleaner-slide';

vi.mock('../../../hooks/useTheme', () => ({
  useTheme: () => ({ theme: 'light' }),
}));

describe('CleanerSlide', () => {
  it('should render the title', () => {
    render(<CleanerSlide />);

    expect(screen.getByText('onboarding.slides.cleaner.title')).toBeInTheDocument();
  });

  it('should render the "new" badge', () => {
    render(<CleanerSlide />);

    expect(screen.getByText('onboarding.common.new')).toBeInTheDocument();
  });

  it('should render the description', () => {
    render(<CleanerSlide />);

    expect(screen.getByText('onboarding.slides.cleaner.description')).toBeInTheDocument();
  });
});
