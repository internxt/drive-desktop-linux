type Props = {
  readonly children: React.ReactNode;
  readonly active?: boolean;
  onClick?: () => void;
  readonly disabled?: boolean;
};

export function DropdownItem({ children, active, onClick, disabled }: Props) {
  return (
    <button
      className={`w-full cursor-pointer px-4 py-1.5 text-left text-sm text-gray-80 active:bg-gray-10 ${
        active && 'bg-gray-1 dark:bg-gray-5'
      } ${disabled ? 'pointer-events-none opacity-50' : ''}`}
      tabIndex={0}
      disabled={disabled}
      onKeyDown={onClick}
      onClick={onClick}>
      {children}
    </button>
  );
}
