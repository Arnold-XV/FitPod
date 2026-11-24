import type { ButtonHTMLAttributes, ReactNode } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  children: ReactNode;
  fullWidth?: boolean;
}

const styles: Record<Variant, string> = {
  primary: 'text-white',
  secondary: 'text-white',
  ghost: '',
  danger: 'text-white',
};

const bgStyles: Record<Variant, React.CSSProperties> = {
  primary: { background: 'var(--secondary)', color: '#ffffff' },
  secondary: { background: 'var(--surface2)', color: 'var(--text)', border: '1px solid var(--border)' },
  ghost: { background: 'transparent', border: '1px solid var(--border)', color: 'var(--text)' },
  danger: { background: 'var(--danger)', color: '#ffffff' },
};

const sizeStyles: Record<Size, string> = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-sm',
  lg: 'px-6 py-3 text-base',
};

export const Button = ({
  variant = 'primary',
  size = 'md',
  children,
  fullWidth,
  disabled,
  style,
  className = '',
  ...props
}: ButtonProps) => {
  return (
    <button
      disabled={disabled}
      style={{
        ...bgStyles[variant],
        fontWeight: 500,
        borderRadius: '8px',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        transition: 'opacity 0.15s, background 0.15s',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        width: fullWidth ? '100%' : undefined,
        border: 'none',
        fontFamily: 'inherit',
        ...style,
      }}
      className={`${sizeStyles[size]} ${styles[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};
