import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { AppShell } from '../components/layout/AppShell';
import { PageWrapper } from '../components/layout/PageWrapper';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { StatCard } from '../components/ui/StatCard';

const getUsernameFromWebId = (webId: string): string => {
  try {
    const url = new URL(webId);
    const parts = url.pathname.split('/').filter(Boolean);
    return parts[0] ?? url.hostname;
  } catch {
    return webId;
  }
};

const HouseIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    <polyline points="9 22 9 12 15 12 15 22" />
  </svg>
);

const ScaleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <path d="M8 12h8M12 8v8" />
  </svg>
);

const FlameIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
  </svg>
);

const DumbbellIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6.5 6.5h11M6.5 17.5h11M3 9.5h18M3 14.5h18" />
  </svg>
);

const AlertIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="8" x2="12" y2="12" />
    <line x1="12" y1="16" x2="12.01" y2="16" />
  </svg>
);

export const DashboardPage = () => {
  const { webId } = useAuth();
  const navigate = useNavigate();
  const username = webId ? getUsernameFromWebId(webId) : 'Pengguna';

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Selamat pagi' : hour < 17 ? 'Selamat siang' : 'Selamat malam';

  return (
    <AppShell>
      <PageWrapper
        title={`${greeting}, ${username}`}
        subtitle="Pantau perjalanan kebugaran Anda hari ini."
      >
        {/* Disclaimer banner */}
        <div
          style={{
            display: 'flex',
            gap: '10px',
            alignItems: 'flex-start',
            padding: '12px 16px',
            background: 'rgba(245,158,11,0.08)',
            border: '1px solid rgba(245,158,11,0.2)',
            borderRadius: '10px',
            marginBottom: '28px',
            fontSize: '12px',
            color: 'var(--warning)',
            lineHeight: 1.6,
          }}
        >
          <AlertIcon />
          <span>
            <strong>Perhatian:</strong> FitPod bukan alat medis. Data dan analisis yang ditampilkan hanya
            untuk informasi dan pemantauan pribadi, bukan untuk diagnosis atau penanganan medis.
          </span>
        </div>

        {/* Stats row */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
            gap: '16px',
            marginBottom: '32px',
          }}
        >
          <StatCard
            label="Berat Terakhir"
            value="—"
            unit="kg"
            icon={<ScaleIcon />}
          />
          <StatCard
            label="Kalori Hari Ini"
            value="—"
            unit="kkal"
            icon={<FlameIcon />}
          />
          <StatCard
            label="Rutinitas Aktif"
            value="—"
            icon={<DumbbellIcon />}
          />
        </div>

        {/* Quick actions */}
        <div style={{ marginBottom: '32px' }}>
          <h2 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--muted)', marginBottom: '14px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Aksi Cepat
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px' }}>
            {[
              { label: 'Catat Latihan', to: '/workout', icon: <DumbbellIcon />, color: 'var(--secondary)' },
              { label: 'Catat Makanan', to: '/nutrition', icon: <FlameIcon />, color: 'var(--accent)' },
              { label: 'Ukur Tubuh', to: '/body', icon: <ScaleIcon />, color: 'var(--warning)' },
            ].map((action) => (
              <button
                key={action.to}
                onClick={() => navigate(action.to)}
                style={{
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: '12px',
                  padding: '20px',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                  textAlign: 'left',
                  transition: 'border-color 0.15s, background 0.15s',
                  fontFamily: 'inherit',
                }}
                onMouseOver={(e) => { e.currentTarget.style.borderColor = action.color; }}
                onMouseOut={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; }}
              >
                <span style={{ color: action.color }}>{action.icon}</span>
                <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text)' }}>{action.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Recent activity */}
        <div>
          <h2 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--muted)', marginBottom: '14px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Aktivitas Terbaru
          </h2>
          <Card>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '40px',
                gap: '12px',
                textAlign: 'center',
              }}
            >
              <HouseIcon />
              <p style={{ color: 'var(--muted)', fontSize: '14px' }}>
                Belum ada aktivitas tercatat. Mulai dengan mencatat latihan atau pengukuran tubuh.
              </p>
              <Button variant="secondary" size="sm" onClick={() => navigate('/body')}>
                Catat Pengukuran
              </Button>
            </div>
          </Card>
        </div>
      </PageWrapper>
    </AppShell>
  );
};
