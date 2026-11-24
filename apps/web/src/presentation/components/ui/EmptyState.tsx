import type { ReactNode } from 'react';

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}

export const EmptyState = ({ icon, title, description, action }: EmptyStateProps) => {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '12px',
        padding: '48px 24px',
        textAlign: 'center',
        color: 'var(--muted)',
      }}
    >
      {icon && (
        <div style={{ opacity: 0.4, marginBottom: '4px' }}>{icon}</div>
      )}
      <p style={{ fontWeight: 600, color: 'var(--text)', fontSize: '15px' }}>{title}</p>
      {description && (
        <p style={{ fontSize: '13px', maxWidth: '320px', lineHeight: 1.6 }}>{description}</p>
      )}
      {action && <div style={{ marginTop: '8px' }}>{action}</div>}
    </div>
  );
};
