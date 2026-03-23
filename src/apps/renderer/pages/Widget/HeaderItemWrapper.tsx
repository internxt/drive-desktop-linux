export function HeaderItemWrapper({
  children,
  active = false,
  onClick,
  disabled,
}: {
  children: JSX.Element;
  active?: boolean;
  onClick?: any;
  disabled?: boolean;
}) {
  return (
    <div
      className={`relative flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg before:absolute before:-inset-px hover:bg-surface hover:shadow hover:ring-1 hover:ring-gray-20 dark:hover:bg-gray-10 ${
        active ? 'bg-surface shadow ring-1 ring-gray-20 dark:bg-gray-10' : undefined
      } ${disabled ? 'pointer-events-none text-gray-40' : undefined}`}
      onClick={onClick}>
      {children}
    </div>
  );
}
