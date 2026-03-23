import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { type Mock } from 'vitest';
import { useTranslationContext } from '../../context/LocalContext';
import { useSyncContext } from '../../context/SyncContext';
import { ItemsSection } from './ItemsSection';

vi.mock('../../context/LocalContext');
vi.mock('../../context/SyncContext');

vi.mock('@headlessui/react', () => ({
  Menu: Object.assign(
    ({ children, as: Tag = 'div', className }: any) => {
      const content = typeof children === 'function' ? children({ open: false }) : children;
      return <Tag className={className}>{content}</Tag>;
    },
    {
      Button: ({ children, className }: any) => <button className={className}>{children}</button>,
      Items: ({ children, className }: any) => <div className={className}>{children}</div>,
      Item: ({ children }: any) => <div>{typeof children === 'function' ? children({ active: false }) : children}</div>,
    },
  ),
  Transition: ({ children }: any) => <>{children}</>,
}));

const defaultProps = {
  numberOfIssues: 0,
  numberOfIssuesDisplay: 0,
  dummyRef: { current: null } as React.RefObject<HTMLDivElement>,
  onQuitClick: vi.fn(),
  onOpenURL: vi.fn(),
};

describe('ItemsSection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useTranslationContext as Mock).mockReturnValue({ translate: (key: string) => key });
    (useSyncContext as Mock).mockReturnValue({ syncStatus: 'STANDBY' });
  });

  it('calls onOpenURL with drive URL when globe icon wrapper is clicked', () => {
    const onOpenURL = vi.fn();
    const { container } = render(<ItemsSection {...defaultProps} onOpenURL={onOpenURL} />);

    const wrappers = container.querySelectorAll('.cursor-pointer');
    fireEvent.click(wrappers[0]);

    expect(onOpenURL).toHaveBeenCalledWith('https://drive.internxt.com');
  });

  it('opens virtual drive folder when folder icon wrapper is clicked', () => {
    const { container } = render(<ItemsSection {...defaultProps} />);

    const wrappers = container.querySelectorAll('.cursor-pointer');
    fireEvent.click(wrappers[1]);

    expect(window.electron.openVirtualDriveFolder).toHaveBeenCalledOnce();
  });

  it('shows issues count when numberOfIssues is greater than 0', () => {
    render(<ItemsSection {...defaultProps} numberOfIssues={3} numberOfIssuesDisplay={3} />);

    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('does not show issues count when numberOfIssues is 0', () => {
    render(<ItemsSection {...defaultProps} numberOfIssues={0} numberOfIssuesDisplay={0} />);

    expect(screen.queryByText('0')).not.toBeInTheDocument();
  });

  it('disables sync menu item when syncing', () => {
    (useSyncContext as Mock).mockReturnValue({ syncStatus: 'RUNNING' });

    render(<ItemsSection {...defaultProps} />);

    const syncButton = screen.getByText('widget.header.dropdown.sync').closest('button');
    expect(syncButton).toBeDisabled();
  });

  it('enables sync menu item when not syncing', () => {
    render(<ItemsSection {...defaultProps} />);

    const syncButton = screen.getByText('widget.header.dropdown.sync').closest('button');
    expect(syncButton).not.toBeDisabled();
  });

  it('calls onQuitClick when quit is clicked', () => {
    const onQuitClick = vi.fn();

    render(<ItemsSection {...defaultProps} onQuitClick={onQuitClick} />);

    const quitButton = screen.getByText('widget.header.dropdown.quit').closest('button')!;
    fireEvent.click(quitButton);

    expect(onQuitClick).toHaveBeenCalledOnce();
  });

  it('opens settings window when preferences is clicked', () => {
    render(<ItemsSection {...defaultProps} />);

    const prefsButton = screen.getByText('widget.header.dropdown.preferences').closest('button')!;
    fireEvent.click(prefsButton);

    expect(window.electron.openSettingsWindow).toHaveBeenCalledOnce();
  });

  it('opens process issues window when issues is clicked', () => {
    render(<ItemsSection {...defaultProps} />);

    const issuesButton = screen.getByText('widget.header.dropdown.issues').closest('button')!;
    fireEvent.click(issuesButton);

    expect(window.electron.openProcessIssuesWindow).toHaveBeenCalledOnce();
  });

  it('calls onOpenURL with support URL when support is clicked', () => {
    const onOpenURL = vi.fn();

    render(<ItemsSection {...defaultProps} onOpenURL={onOpenURL} />);

    const supportButton = screen.getByText('widget.header.dropdown.support').closest('button')!;
    fireEvent.click(supportButton);

    expect(onOpenURL).toHaveBeenCalledWith('https://help.internxt.com');
  });

  it('calls logout when logout is clicked', () => {
    render(<ItemsSection {...defaultProps} />);

    const logoutButton = screen.getByText('widget.header.dropdown.logout').closest('button')!;
    fireEvent.click(logoutButton);

    expect(window.electron.logout).toHaveBeenCalledOnce();
  });
});
