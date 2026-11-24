import type { ReactNode, HTMLAttributes } from 'react';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  padding?: boolean;
}

export const Card = ({ children, padding = true, style, className = '', ...props }: CardProps) => {
  return (
    <div
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: '12px',
        padding: padding ? '20px' : undefined,
        ...style,
      }}
      className={className}
      {...props}
    >
      {children}
    </div>
  );
};
