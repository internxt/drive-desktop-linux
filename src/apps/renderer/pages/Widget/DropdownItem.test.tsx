import { render, screen, fireEvent } from '@testing-library/react';
import { DropdownItem } from './DropdownItem';

describe('DropdownItem', () => {
  it('renders children', () => {
    render(
      <DropdownItem>
        <span>My option</span>
      </DropdownItem>,
    );

    expect(screen.getByText('My option')).toBeInTheDocument();
  });

  it('calls onClick when clicked', () => {
    const onClick = vi.fn();

    render(
      <DropdownItem onClick={onClick}>
        <span>Click me</span>
      </DropdownItem>,
    );

    fireEvent.click(screen.getByRole('button'));

    expect(onClick).toHaveBeenCalledOnce();
  });

  it('calls onClick on key down', () => {
    const onClick = vi.fn();

    render(
      <DropdownItem onClick={onClick}>
        <span>Press me</span>
      </DropdownItem>,
    );

    fireEvent.keyDown(screen.getByRole('button'));

    expect(onClick).toHaveBeenCalledOnce();
  });

  it('is disabled when disabled prop is true', () => {
    render(
      <DropdownItem disabled>
        <span>Disabled</span>
      </DropdownItem>,
    );

    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('applies active styles when active', () => {
    render(
      <DropdownItem active>
        <span>Active</span>
      </DropdownItem>,
    );

    expect(screen.getByRole('button').className).toContain('bg-gray-1');
  });

  it('does not apply active styles when not active', () => {
    render(
      <DropdownItem active={false}>
        <span>Inactive</span>
      </DropdownItem>,
    );

    expect(screen.getByRole('button').className).not.toContain('bg-gray-1 dark:bg-gray-5');
  });
});
