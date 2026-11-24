import { useAuth } from '../hooks/useAuth';
import { AppShell } from '../components/layout/AppShell';
import { PageWrapper } from '../components/layout/PageWrapper';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Spinner } from '../components/ui/Spinner';

export const SettingsPage = () => {
  const { webId, logout, isLoading } = useAuth();

  return (
    <AppShell>
      <PageWrapper title="Pengaturan" subtitle="Kelola akun dan preferensi FitPod Anda.">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '600px' }}>
          {/* Account */}
          <Card>
            <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text)', marginBottom: '20px' }}>
              Akun
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 500, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: '6px' }}>
                  WebID
                </label>
                <div
                  style={{
                    padding: '10px 14px',
                    background: 'var(--surface2)',
                    borderRadius: '8px',
                    border: '1px solid var(--border)',
                    fontSize: '13px',
                    color: 'var(--text)',
                    wordBreak: 'break-all',
                    fontFamily: 'monospace',
                  }}
                >
                  {webId ?? '—'}
                </div>
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 500, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: '6px' }}>
                  Status Sesi
                </label>
                <Badge variant="success">Aktif</Badge>
              </div>
            </div>

            <div style={{ marginTop: '24px', paddingTop: '20px', borderTop: '1px solid var(--border)' }}>
              <Button
                variant="danger"
                onClick={logout}
                disabled={isLoading}
              >
                {isLoading ? <Spinner size={14} /> : null}
                {isLoading ? 'Keluar...' : 'Keluar dari FitPod'}
              </Button>
            </div>
          </Card>

          {/* Pod info */}
          <Card>
            <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text)', marginBottom: '20px' }}>
              Solid Pod
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px',
                  padding: '14px',
                  background: 'var(--surface2)',
                  borderRadius: '10px',
                }}
              >
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent)', marginTop: 6, flexShrink: 0 }} />
                <div>
                  <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)', marginBottom: '4px' }}>
                    Data tersimpan di Pod Anda
                  </p>
                  <p style={{ fontSize: '12px', color: 'var(--muted)', lineHeight: 1.6 }}>
                    Semua data kebugaran Anda disimpan langsung di Solid Pod Anda sendiri. FitPod tidak
                    menyimpan salinan data Anda di server kami.
                  </p>
                </div>
              </div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px',
                  padding: '14px',
                  background: 'var(--surface2)',
                  borderRadius: '10px',
                }}
              >
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--secondary)', marginTop: 6, flexShrink: 0 }} />
                <div>
                  <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)', marginBottom: '4px' }}>
                    Standar Solid Protocol
                  </p>
                  <p style={{ fontSize: '12px', color: 'var(--muted)', lineHeight: 1.6 }}>
                    FitPod menggunakan Solid Protocol (W3C) untuk interoperabilitas data. Pod Anda
                    dapat digunakan bersama aplikasi Solid lainnya.
                  </p>
                </div>
              </div>
            </div>
          </Card>

          {/* Language */}
          <Card>
            <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text)', marginBottom: '16px' }}>
              Bahasa
            </h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '14px', color: 'var(--text)' }}>Bahasa Indonesia</span>
              <Badge variant="info">Aktif</Badge>
            </div>
            <p style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '8px' }}>
              Dukungan bahasa lain akan hadir di versi mendatang.
            </p>
          </Card>

          {/* App info */}
          <Card>
            <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text)', marginBottom: '16px' }}>
              Tentang FitPod
            </h3>
            <div style={{ fontSize: '13px', color: 'var(--muted)', lineHeight: 1.8 }}>
              <p>Versi: 0.1.0 (beta)</p>
              <p>Arsitektur: Solid Pod + Linked Data</p>
              <p style={{ marginTop: '10px', fontSize: '12px' }}>
                FitPod adalah aplikasi kebugaran terdesentralisasi berbasis Solid Pod.
                Tidak ada server pusat. Data Anda, kendali Anda.
              </p>
            </div>
          </Card>
        </div>
      </PageWrapper>
    </AppShell>
  );
};
