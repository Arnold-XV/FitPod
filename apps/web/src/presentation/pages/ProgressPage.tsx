import { useState, useEffect, useCallback } from 'react';
import { container } from '@/app/container';
import type { BodyMeasurement } from '@/domain/body/entities';
import { calculateBMI } from '@/domain/body/entities';
import { AppShell } from '../components/layout/AppShell';
import { PageWrapper } from '../components/layout/PageWrapper';
import { Card } from '../components/ui/Card';
import { Spinner } from '../components/ui/Spinner';
import { EmptyState } from '../components/ui/EmptyState';

const ChartIcon = () => (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
  </svg>
);

const BAR_HEIGHT = 160;
const BAR_WIDTH = 36;

const WeightChart = ({ data }: { data: BodyMeasurement[] }) => {
  if (data.length === 0) return null;

  const weights = data.map((m) => m.weightKg);
  const minW = Math.min(...weights);
  const maxW = Math.max(...weights);
  const range = maxW - minW || 1;

  const sliced = data.slice(0, 12).reverse();

  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px', height: `${BAR_HEIGHT + 32}px`, paddingBottom: '24px' }}>
      {sliced.map((m) => {
        const pct = ((m.weightKg - minW) / range) * 0.8 + 0.1;
        const height = Math.max(8, pct * BAR_HEIGHT);
        return (
          <div key={m.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
            <span style={{ fontSize: '10px', color: 'var(--muted)' }}>{m.weightKg}</span>
            <div
              style={{
                width: BAR_WIDTH,
                height,
                background: 'var(--secondary)',
                opacity: 0.85,
                transition: 'height 0.3s',
              }}
            />
            <span style={{ fontSize: '9px', color: 'var(--muted)', transform: 'rotate(-45deg)', transformOrigin: 'right', whiteSpace: 'nowrap', marginTop: '4px' }}>
              {m.date.slice(5)}
            </span>
          </div>
        );
      })}
    </div>
  );
};

const BmiChart = ({ data }: { data: BodyMeasurement[] }) => {
  if (data.length === 0) return null;

  const bmis = data.slice(0, 12).reverse().map((m) => ({
    date: m.date.slice(5),
    bmi: calculateBMI(m.weightKg, m.heightCm),
  }));

  const maxBmi = Math.max(...bmis.map((b) => b.bmi));
  const minBmi = Math.min(...bmis.map((b) => b.bmi));
  const range = maxBmi - minBmi || 1;

  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px', height: `${BAR_HEIGHT + 32}px`, paddingBottom: '24px' }}>
      {bmis.map((b, i) => {
        const pct = ((b.bmi - minBmi) / range) * 0.8 + 0.1;
        const height = Math.max(8, pct * BAR_HEIGHT);
        return (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
            <span style={{ fontSize: '10px', color: 'var(--muted)' }}>{b.bmi.toFixed(1)}</span>
            <div
              style={{
                width: BAR_WIDTH,
                height,
                background: 'var(--accent)',
                borderRadius: '4px 4px 0 0',
                opacity: 0.85,
              }}
            />
            <span style={{ fontSize: '9px', color: 'var(--muted)', transform: 'rotate(-45deg)', transformOrigin: 'right', whiteSpace: 'nowrap', marginTop: '4px' }}>
              {b.date}
            </span>
          </div>
        );
      })}
    </div>
  );
};

export const ProgressPage = () => {
  const [measurements, setMeasurements] = useState<BodyMeasurement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const uc = await container.getListMeasurementsUseCase();
      const result = await uc();
      if (result.ok) {
        const sorted = [...result.value].sort((a, b) => b.date.localeCompare(a.date));
        setMeasurements(sorted);
      } else {
        setError(result.error.message);
      }
    } catch {
      setError('Kesalahan jaringan.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const latest = measurements[0];
  const prev = measurements[1];
  const weightChange = latest && prev
    ? (latest.weightKg - prev.weightKg).toFixed(1)
    : null;

  return (
    <AppShell>
      <PageWrapper title="Progress" subtitle="Lihat tren dan rekaman pribadi Anda.">
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '64px' }}>
            <Spinner size={32} />
          </div>
        ) : error ? (
          <Card>
            <p style={{ color: 'var(--danger)', textAlign: 'center', padding: '32px' }}>{error}</p>
          </Card>
        ) : measurements.length < 2 ? (
          <Card>
            <EmptyState
              icon={<ChartIcon />}
              title="Belum cukup data untuk grafik"
              description="Tambahkan minimal 2 pengukuran tubuh untuk melihat tren."
            />
          </Card>
        ) : (
          <>
            {/* Summary */}
            {latest && (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
                  gap: '16px',
                  marginBottom: '28px',
                }}
              >
                <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '20px' }}>
                  <div style={{ fontSize: '11px', color: 'var(--muted)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Berat Terakhir</div>
                  <div style={{ fontSize: '28px', fontWeight: 700, color: 'var(--text)' }}>{latest.weightKg}<span style={{ fontSize: '14px', color: 'var(--muted)', marginLeft: '4px' }}>kg</span></div>
                  {weightChange !== null && (
                    <div style={{ fontSize: '12px', color: parseFloat(weightChange) < 0 ? 'var(--accent)' : 'var(--danger)', marginTop: '4px' }}>
                      {parseFloat(weightChange) > 0 ? '+' : ''}{weightChange} kg dari sebelumnya
                    </div>
                  )}
                </div>
                <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '20px' }}>
                  <div style={{ fontSize: '11px', color: 'var(--muted)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>BMI Terkini</div>
                  <div style={{ fontSize: '28px', fontWeight: 700, color: 'var(--text)' }}>{calculateBMI(latest.weightKg, latest.heightCm).toFixed(1)}</div>
                </div>
                <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '20px' }}>
                  <div style={{ fontSize: '11px', color: 'var(--muted)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Total Pengukuran</div>
                  <div style={{ fontSize: '28px', fontWeight: 700, color: 'var(--text)' }}>{measurements.length}</div>
                </div>
              </div>
            )}

            {/* Weight chart */}
            <Card style={{ marginBottom: '24px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--muted)', marginBottom: '20px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Tren Berat Badan (kg)
              </h3>
              <div style={{ overflowX: 'auto' }}>
                <WeightChart data={measurements} />
              </div>
            </Card>

            {/* BMI chart */}
            <Card style={{ marginBottom: '24px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--muted)', marginBottom: '20px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Tren BMI
              </h3>
              <div style={{ overflowX: 'auto' }}>
                <BmiChart data={measurements} />
              </div>
            </Card>

            {/* PR table placeholder */}
            <Card>
              <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--muted)', marginBottom: '20px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Rekor Pribadi (PR)
              </h3>
              <EmptyState
                title="Belum ada rekor latihan"
                description="Rekor pribadi dari sesi workout akan muncul di sini setelah fitur latihan tersedia."
              />
            </Card>
          </>
        )}
      </PageWrapper>
    </AppShell>
  );
};
