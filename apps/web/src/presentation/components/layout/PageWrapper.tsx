import type { ReactNode } from 'react';

interface PageWrapperProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
}

export const PageWrapper = ({ title, subtitle, actions, children }: PageWrapperProps) => {
  return (
    <div style={{ padding: '32px 32px 80px', maxWidth: '1100px', margin: '0 auto', width: '100%' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          marginBottom: '28px',
          gap: '16px',
          flexWrap: 'wrap',
        }}
      >
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text)', margin: 0 }}>{title}</h1>
          {subtitle && (
            <p style={{ fontSize: '14px', color: 'var(--muted)', marginTop: '4px' }}>{subtitle}</p>
          )}
        </div>
        {actions && <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>{actions}</div>}
      </div>
      {children}
    </div>
  );
};
