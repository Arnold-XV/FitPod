import { useState } from 'react';
import { AppShell } from '../components/layout/AppShell';
import { PageWrapper } from '../components/layout/PageWrapper';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { EmptyState } from '../components/ui/EmptyState';

const ShieldIcon = () => (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
);

const AlertIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
    <line x1="12" y1="9" x2="12" y2="13" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);

const dataCategories = [
  { id: 'body', label: 'Data Tubuh (berat, tinggi, BMI)' },
  { id: 'routines', label: 'Rutinitas Latihan' },
  { id: 'sessions', label: 'Sesi Latihan' },
  { id: 'health', label: 'Ringkasan Kesehatan (trainer-summary)' },
];

const durations = [
  { value: '1m', label: '1 Bulan' },
  { value: '3m', label: '3 Bulan' },
  { value: '6m', label: '6 Bulan' },
  { value: 'custom', label: 'Tanggal Kustom' },
];

export const AccessPage = () => {
  const [trainerWebId, setTrainerWebId] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [duration, setDuration] = useState('1m');
  const [customDate, setCustomDate] = useState('');

  const toggleCategory = (id: string) => {
    setSelectedCategories((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  };

  return (
    <AppShell>
      <PageWrapper title="Kelola Akses Profesional" subtitle="Kontrol siapa yang dapat mengakses data kebugaran Anda.">
        {/* Privacy warning */}
        <div
          style={{
            display: 'flex',
            gap: '10px',
            padding: '14px 16px',
            background: 'rgba(245,158,11,0.08)',
            border: '1px solid rgba(245,158,11,0.2)',
            borderRadius: '10px',
            marginBottom: '24px',
            fontSize: '13px',
            color: 'var(--warning)',
            lineHeight: 1.6,
          }}
        >
          <AlertIcon />
          <span>
            Memberikan akses berarti pelatih atau profesional kesehatan dapat membaca data yang Anda
            pilih dari Solid Pod Anda. Akses dapat dicabut kapan saja. FitPod tidak memiliki
            kemampuan untuk mengakses data tanpa izin eksplisit Anda.
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '24px' }}>
          {/* Grant form */}
          <Card>
            <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text)', marginBottom: '20px' }}>
              Berikan Akses Baru
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <Input
                label="WebID Pelatih / Profesional"
                type="url"
                placeholder="https://trainer.solidcommunity.net/profile/card#me"
                value={trainerWebId}
                onChange={(e) => setTrainerWebId(e.target.value)}
              />

              <div>
                <label style={{ fontSize: '13px', fontWeight: 500, color: 'var(--muted)', display: 'block', marginBottom: '10px' }}>
                  Kategori Data
                </label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {dataCategories.map((cat) => (
                    <label
                      key={cat.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        cursor: 'pointer',
                        fontSize: '14px',
                        color: 'var(--text)',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={selectedCategories.includes(cat.id)}
                        onChange={() => toggleCategory(cat.id)}
                        style={{ width: '16px', height: '16px', accentColor: 'var(--secondary)' }}
                      />
                      {cat.label}
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label style={{ fontSize: '13px', fontWeight: 500, color: 'var(--muted)', display: 'block', marginBottom: '10px' }}>
                  Durasi Akses
                </label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {durations.map((d) => (
                    <button
                      key={d.value}
                      onClick={() => setDuration(d.value)}
                      style={{
                        padding: '6px 14px',
                        borderRadius: '6px',
                        border: `1px solid ${duration === d.value ? 'var(--secondary)' : 'var(--border)'}`,
                        background: duration === d.value ? 'rgba(217,119,87,0.15)' : 'transparent',
                        color: duration === d.value ? 'var(--secondary)' : 'var(--muted)',
                        fontSize: '13px',
                        fontWeight: duration === d.value ? 600 : 400,
                        cursor: 'pointer',
                        fontFamily: 'inherit',
                        transition: 'all 0.15s',
                      }}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
                {duration === 'custom' && (
                  <div style={{ marginTop: '12px' }}>
                    <Input
                      label="Tanggal kedaluwarsa"
                      type="date"
                      value={customDate}
                      onChange={(e) => setCustomDate(e.target.value)}
                      style={{ maxWidth: '220px' }}
                    />
                  </div>
                )}
              </div>

              <Button
                variant="primary"
                fullWidth
                disabled={!trainerWebId.trim() || selectedCategories.length === 0}
              >
                Berikan Akses
              </Button>
              <p style={{ fontSize: '11px', color: 'var(--muted)' }}>
                Fitur pemberian akses via Pod ACL segera hadir.
              </p>
            </div>
          </Card>

          {/* Current grants */}
          <Card>
            <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text)', marginBottom: '20px' }}>
              Akses Aktif
            </h3>
            <EmptyState
              icon={<ShieldIcon />}
              title="Belum ada akses diberikan"
              description="Daftar akses aktif kepada pelatih atau profesional kesehatan akan muncul di sini."
            />
          </Card>
        </div>
      </PageWrapper>
    </AppShell>
  );
};
