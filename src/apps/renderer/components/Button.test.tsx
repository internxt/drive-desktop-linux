import { fireEvent, render, screen } from '@testing-library/react';
import Button from './Button';

describe('Button', () => {
  it('should render with type button by default and trigger onClick', () => {
    const onClick = vi.fn();

    render(<Button onClick={onClick}>Submit</Button>);

    const button = screen.getByRole('button', { name: 'Submit' });

    expect(button).toHaveAttribute('type', 'button');

    fireEvent.click(button);

    expect(onClick).toBeCalledTimes(1);
  });

  it('should be disabled and use disabled styles when disabled', () => {
    render(<Button disabled>Processing</Button>);

    const button = screen.getByRole('button', { name: 'Processing' });

    expect(button).toBeDisabled();
    expect(button).toHaveClass('bg-gray-30');
  });

  it('should render the outline variant styles', () => {
    render(<Button variant="outline">Cancel</Button>);

    const button = screen.getByRole('button', { name: 'Cancel' });

    expect(button).toHaveClass('border-2');
    expect(button).toHaveClass('border-primary');
    expect(button).toHaveClass('text-primary');
  });
});
