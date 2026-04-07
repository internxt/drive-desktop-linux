import { ReactNode } from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'danger' | 'secondary' | 'outline' | 'primaryLight' | 'dangerLight';
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  children: ReactNode;
  customClassName?: string;
}

export default function Button({
  variant = 'primary',
  size = 'md',
  children,
  customClassName,
  className,
  type = 'button',
  onClick,
  ...buttonProps
}: ButtonProps) {
  const variants = {
    primary: buttonProps.disabled
      ? 'bg-gray-30 dark:bg-gray-5 text-white dark:text-gray-30'
      : 'bg-primary active:bg-primary-dark text-white',
    primaryLight: buttonProps.disabled
      ? 'bg-gray-30 dark:bg-gray-5 text-white dark:text-gray-30'
      : 'border border-primary bg-surface text-primary hover:cursor-pointer',
    secondary: buttonProps.disabled
      ? 'bg-surface text-gray-40 border border-gray-5 dark:bg-gray-5 dark:text-gray-40'
      : 'bg-surface active:bg-gray-1 text-highlight border border-gray-20 dark:bg-gray-5 dark:active:bg-gray-10 dark:active:border-gray-30',
    danger: buttonProps.disabled
      ? 'bg-gray-30 dark:bg-gray-5 text-white dark:text-gray-30'
      : 'bg-red active:bg-red-dark text-white',
    dangerLight: buttonProps.disabled
      ? 'bg-gray-30 dark:bg-gray-5 text-white dark:text-gray-30'
      : 'border border-red-dark bg-surface text-red-dark hover:cursor-pointer',
    outline: buttonProps.disabled
      ? 'bg-transparent border-2 border-gray-30 text-gray-30 dark:border-gray-40 dark:text-gray-40 font-bold'
      : 'bg-transparent border-2 border-primary text-primary active:bg-primary/10 dark:border-primary dark:text-primary font-bold',
  };

  const sizes = {
    sm: 'h-7 px-3 rounded-md text-sm',
    md: 'h-8 px-[14px] rounded-lg text-base',
    lg: 'h-10 px-5 rounded-lg text-base',
    xl: 'h-11 px-5 rounded-lg text-base',
    '2xl': 'h-12 px-5 rounded-lg text-lg',
  };

  const styles = `whitespace-nowrap shadow-sm outline-none transition-all duration-75 ease-in-out focus-visible:outline-none ${
    variants[variant]
  } ${sizes[size]} ${customClassName ?? ''} ${className ?? ''}`;

  return (
    <button type={type} className={styles} onClick={onClick} {...buttonProps}>
      {children}
    </button>
  );
}
