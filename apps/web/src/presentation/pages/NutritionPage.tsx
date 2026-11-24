import { AppShell } from '../components/layout/AppShell';
import { PageWrapper } from '../components/layout/PageWrapper';
import { Card } from '../components/ui/Card';
import { EmptyState } from '../components/ui/EmptyState';
import { Input } from '../components/ui/Input';

const ForkIcon = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2" />
    <path d="M7 2v20" />
    <path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3zm0 0v7" />
  </svg>
);

const meals = [
  { id: 'sarapan', label: 'Sarapan', time: '06:00 – 09:00' },
  { id: 'siang', label: 'Makan Siang', time: '11:00 – 14:00' },
  { id: 'malam', label: 'Makan Malam', time: '17:00 – 20:00' },
  { id: 'camilan', label: 'Camilan', time: 'Kapan saja' },
];

export const NutritionPage = () => {
  return (
    <AppShell>
      <PageWrapper title="Pangan" subtitle="Pantau asupan makanan dan gizi harian Anda.">
        {/* Search */}
        <div style={{ marginBottom: '24px', maxWidth: '480px' }}>
          <Input
            placeholder="Cari makanan atau minuman..."
            type="search"
            disabled
          />
          <p style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '6px' }}>
            Pencarian makanan segera hadir.
          </p>
        </div>

        {/* Summary row */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '12px',
            marginBottom: '28px',
          }}
        >
          {[
            { label: 'Kalori', value: '0', unit: 'kkal' },
            { label: 'Protein', value: '0', unit: 'g' },
            { label: 'Karbohidrat', value: '0', unit: 'g' },
            { label: 'Lemak', value: '0', unit: 'g' },
          ].map((s) => (
            <div
              key={s.label}
              style={{
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: '10px',
                padding: '14px',
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text)' }}>
                {s.value}
                <span style={{ fontSize: '12px', fontWeight: 400, color: 'var(--muted)', marginLeft: '2px' }}>{s.unit}</span>
              </div>
              <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '2px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {s.label}
              </div>
            </div>
          ))}
        </div>

        {/* Meal sections */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {meals.map((meal) => (
            <Card key={meal.id} padding={false}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '14px 20px',
                  borderBottom: '1px solid var(--border)',
                }}
              >
                <div>
                  <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text)' }}>{meal.label}</span>
                  <span style={{ fontSize: '12px', color: 'var(--muted)', marginLeft: '8px' }}>{meal.time}</span>
                </div>
                <button
                  disabled
                  style={{
                    background: 'var(--surface2)',
                    border: '1px solid var(--border)',
                    borderRadius: '6px',
                    padding: '6px 12px',
                    fontSize: '12px',
                    color: 'var(--muted)',
                    cursor: 'not-allowed',
                    fontFamily: 'inherit',
                  }}
                >
                  + Tambah
                </button>
              </div>
              <EmptyState
                icon={<ForkIcon />}
                title={`Belum ada makanan di ${meal.label}`}
                description="Segera hadir — pencatatan makanan harian."
              />
            </Card>
          ))}
        </div>
      </PageWrapper>
    </AppShell>
  );
};
