import { render, screen, fireEvent } from '@testing-library/react';
import { HeaderItemWrapper } from './HeaderItemWrapper';

describe('HeaderItemWrapper', () => {
  it('renders children', () => {
    render(
      <HeaderItemWrapper>
        <span>Icon</span>
      </HeaderItemWrapper>,
    );

    expect(screen.getByText('Icon')).toBeInTheDocument();
  });

  it('calls onClick when clicked', () => {
    const onClick = vi.fn();

    render(
      <HeaderItemWrapper onClick={onClick}>
        <span>Click</span>
      </HeaderItemWrapper>,
    );

    fireEvent.click(screen.getByText('Click').parentElement!);

    expect(onClick).toHaveBeenCalledOnce();
  });

  it('applies active styles when active is true', () => {
    const { container } = render(
      <HeaderItemWrapper active>
        <span>Active</span>
      </HeaderItemWrapper>,
    );

    expect(container.firstChild).toHaveClass('bg-surface');
  });

  it('does not apply active styles when active is false', () => {
    const { container } = render(
      <HeaderItemWrapper active={false}>
        <span>Inactive</span>
      </HeaderItemWrapper>,
    );

    expect(container.firstChild).not.toHaveClass('ring-1');
  });

  it('applies disabled styles when disabled is true', () => {
    const { container } = render(
      <HeaderItemWrapper disabled>
        <span>Disabled</span>
      </HeaderItemWrapper>,
    );

    expect(container.firstChild).toHaveClass('pointer-events-none');
    expect(container.firstChild).toHaveClass('text-gray-40');
  });
});
