import type { ReactNode } from 'react';

type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info';

interface BadgeProps {
  children: ReactNode;
  variant?: BadgeVariant;
}

const variantStyles: Record<BadgeVariant, React.CSSProperties> = {
  default: { background: 'var(--surface2)', color: 'var(--muted)' },
  success: { background: 'rgba(217,119,87,0.15)', color: 'var(--secondary)' },
  warning: { background: 'rgba(245,158,11,0.15)', color: 'var(--warning)' },
  danger: { background: 'rgba(239,68,68,0.15)', color: 'var(--danger)' },
  info: { background: 'rgba(217,119,87,0.12)', color: 'var(--secondary)' },
};

export const Badge = ({ children, variant = 'default' }: BadgeProps) => {
  return (
    <span
      style={{
        ...variantStyles[variant],
        fontSize: '11px',
        fontWeight: 600,
        padding: '2px 8px',
        borderRadius: '99px',
        display: 'inline-block',
        textTransform: 'uppercase',
        letterSpacing: '0.04em',
      }}
    >
      {children}
    </span>
  );
};
