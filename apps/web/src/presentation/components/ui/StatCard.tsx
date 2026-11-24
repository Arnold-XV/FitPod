interface StatCardProps {
  label: string;
  value: string | number;
  unit?: string;
  change?: string;
  changePositive?: boolean;
  icon?: React.ReactNode;
}

export const StatCard = ({ label, value, unit, change, changePositive, icon }: StatCardProps) => {
  return (
    <div
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: '12px',
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          {label}
        </span>
        {icon && <span style={{ color: 'var(--muted)', opacity: 0.6 }}>{icon}</span>}
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
        <span style={{ fontSize: '28px', fontWeight: 700, color: 'var(--text)', lineHeight: 1 }}>
          {value}
        </span>
        {unit && (
          <span style={{ fontSize: '14px', color: 'var(--muted)', fontWeight: 500 }}>{unit}</span>
        )}
      </div>
      {change && (
        <span
          style={{
            fontSize: '12px',
            fontWeight: 500,
            color: changePositive ? 'var(--accent)' : 'var(--danger)',
          }}
        >
          {change}
        </span>
      )}
    </div>
  );
};
