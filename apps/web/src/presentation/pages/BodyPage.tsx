import { useState, useEffect, useCallback } from 'react';
import { container } from '@/app/container';
import type { BodyMeasurement } from '@/domain/body/entities';
import { calculateBMI } from '@/domain/body/entities';
import { AppShell } from '../components/layout/AppShell';
import { PageWrapper } from '../components/layout/PageWrapper';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Input, Select, Textarea } from '../components/ui/Input';
import { Spinner } from '../components/ui/Spinner';
import { EmptyState } from '../components/ui/EmptyState';

const ScaleIcon = () => (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <path d="M8 12h8M12 8v8" />
  </svg>
);

const bmiCategory = (bmi: number): string => {
  if (bmi < 18.5) return 'Kurus';
  if (bmi < 25) return 'Normal';
  if (bmi < 30) return 'Gemuk';
  return 'Obesitas';
};

const trustLabelMap: Record<string, { label: string; variant: 'default' | 'success' | 'info' }> = {
  self: { label: 'Mandiri', variant: 'default' },
  measured: { label: 'Terukur', variant: 'info' },
  clinician: { label: 'Klinis', variant: 'success' },
};

interface FormState {
  date: string;
  weightKg: string;
  heightCm: string;
  bodyFatPct: string;
  bodyFatMethod: 'bia' | 'caliper' | 'dexa' | 'estimate' | '';
  note: string;
}

type FormErrors = { [K in keyof FormState]?: string };

const today = () => new Date().toISOString().split('T')[0] ?? '';

const initForm = (): FormState => ({
  date: today(),
  weightKg: '',
  heightCm: '',
  bodyFatPct: '',
  bodyFatMethod: '',
  note: '',
});

export const BodyPage = () => {
  const [measurements, setMeasurements] = useState<BodyMeasurement[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormState>(initForm);
  const [formErrors, setFormErrors] = useState<FormErrors>({});

  const loadMeasurements = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const listUseCase = await container.getListMeasurementsUseCase();
      const result = await listUseCase({ monthsBack: 6 }); // Only last 6 months for better performance
      if (result.ok) {
        const sorted = [...result.value].sort((a, b) => b.date.localeCompare(a.date));
        setMeasurements(sorted);
      } else {
        setError(`Gagal memuat data: ${result.error.message}`);
      }
    } catch (e) {
      setError('Kesalahan jaringan. Periksa koneksi ke Pod Anda.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMeasurements();
  }, [loadMeasurements]);

  const validate = (): boolean => {
    const errors: FormErrors = {};
    const w = parseFloat(form.weightKg);
    const h = parseFloat(form.heightCm);

    if (!form.date) errors.date = 'Tanggal wajib diisi';
    if (!form.weightKg || isNaN(w) || w < 20 || w > 400) errors.weightKg = 'Berat harus antara 20–400 kg';
    if (!form.heightCm || isNaN(h) || h < 50 || h > 260) errors.heightCm = 'Tinggi harus antara 50–260 cm';
    if (form.bodyFatPct) {
      const bf = parseFloat(form.bodyFatPct);
      if (isNaN(bf) || bf < 0 || bf > 100) errors.bodyFatPct = 'Lemak tubuh harus antara 0–100%';
      if (!form.bodyFatMethod) errors.bodyFatMethod = 'Pilih metode pengukuran lemak';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const addUseCase = await container.getAddMeasurementUseCase();
      const result = await addUseCase({
        date: form.date,
        weightKg: parseFloat(form.weightKg),
        heightCm: parseFloat(form.heightCm),
        bodyFatPct: form.bodyFatPct ? parseFloat(form.bodyFatPct) : undefined,
        bodyFatMethod: form.bodyFatMethod || undefined,
        note: form.note || undefined,
      });

      if (result.ok) {
        setForm(initForm());
        setShowForm(false);
        await loadMeasurements();
      } else {
        setSubmitError(`Gagal menyimpan: ${result.error.message}`);
      }
    } catch (e) {
      setSubmitError('Kesalahan jaringan. Gagal menyimpan ke Pod.');
    } finally {
      setSubmitting(false);
    }
  };

  const setField = (field: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setFormErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  return (
    <AppShell>
      <PageWrapper
        title="Tubuh"
        subtitle="Pantau pengukuran fisik Anda dari waktu ke waktu."
        actions={
          <Button variant="primary" size="md" onClick={() => setShowForm((v) => !v)}>
            {showForm ? 'Batal' : '+ Tambah Pengukuran'}
          </Button>
        }
      >
        {/* Add measurement form */}
        {showForm && (
          <Card style={{ marginBottom: '24px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text)', marginBottom: '20px' }}>
              Tambah Pengukuran Baru
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
              <Input
                label="Tanggal"
                type="date"
                value={form.date}
                onChange={(e) => setField('date', e.target.value)}
                error={formErrors.date}
              />
              <Input
                label="Berat Badan (kg)"
                type="number"
                step="0.1"
                min="20"
                max="400"
                placeholder="70.5"
                value={form.weightKg}
                onChange={(e) => setField('weightKg', e.target.value)}
                error={formErrors.weightKg}
              />
              <Input
                label="Tinggi Badan (cm)"
                type="number"
                step="0.1"
                min="50"
                max="260"
                placeholder="170"
                value={form.heightCm}
                onChange={(e) => setField('heightCm', e.target.value)}
                error={formErrors.heightCm}
              />
              <Input
                label="Lemak Tubuh (%) — opsional"
                type="number"
                step="0.1"
                min="0"
                max="100"
                placeholder="20.0"
                value={form.bodyFatPct}
                onChange={(e) => setField('bodyFatPct', e.target.value)}
                error={formErrors.bodyFatPct}
              />
              <Select
                label="Metode Lemak Tubuh"
                value={form.bodyFatMethod}
                onChange={(e) => setField('bodyFatMethod', e.target.value)}
                error={formErrors.bodyFatMethod}
              >
                <option value="">— pilih metode —</option>
                <option value="bia">BIA (Bioelectrical Impedance)</option>
                <option value="caliper">Caliper (Lipatan Kulit)</option>
                <option value="dexa">DEXA Scan</option>
                <option value="estimate">Estimasi</option>
              </Select>
              <div style={{ gridColumn: '1 / -1' }}>
                <Textarea
                  label="Catatan — opsional"
                  placeholder="Kondisi saat pengukuran, waktu pengukuran, dll."
                  value={form.note}
                  onChange={(e) => setField('note', e.target.value)}
                />
              </div>
            </div>

            {submitError && (
              <div
                style={{
                  marginTop: '16px',
                  padding: '10px 14px',
                  background: 'rgba(239,68,68,0.1)',
                  border: '1px solid rgba(239,68,68,0.3)',
                  borderRadius: '8px',
                  fontSize: '13px',
                  color: 'var(--danger)',
                }}
              >
                {submitError}
              </div>
            )}

            <div style={{ display: 'flex', gap: '10px', marginTop: '20px', justifyContent: 'flex-end' }}>
              <Button variant="ghost" onClick={() => { setShowForm(false); setForm(initForm()); }}>
                Batal
              </Button>
              <Button variant="primary" onClick={handleSubmit} disabled={submitting}>
                {submitting ? <Spinner size={14} /> : null}
                {submitting ? 'Menyimpan...' : 'Simpan ke Pod'}
              </Button>
            </div>
          </Card>
        )}

        {/* Measurements table */}
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '64px' }}>
            <Spinner size={32} />
          </div>
        ) : error ? (
          <Card>
            <div
              style={{
                padding: '32px',
                textAlign: 'center',
                color: 'var(--danger)',
                fontSize: '14px',
              }}
            >
              <p style={{ marginBottom: '16px' }}>{error}</p>
              <Button variant="secondary" size="sm" onClick={loadMeasurements}>
                Coba Lagi
              </Button>
            </div>
          </Card>
        ) : measurements.length === 0 ? (
          <Card>
            <EmptyState
              icon={<ScaleIcon />}
              title="Belum ada data pengukuran"
              description="Mulai pantau tubuh Anda dengan menambahkan pengukuran pertama."
              action={
                <Button variant="primary" size="sm" onClick={() => setShowForm(true)}>
                  Tambah Pengukuran
                </Button>
              }
            />
          </Card>
        ) : (
          <Card padding={false}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    {['Tanggal', 'Berat (kg)', 'Tinggi (cm)', 'BMI', 'Lemak (%)', 'Metode', 'Kepercayaan', 'Catatan'].map((h) => (
                      <th
                        key={h}
                        style={{
                          padding: '12px 16px',
                          textAlign: 'left',
                          fontSize: '11px',
                          fontWeight: 600,
                          color: 'var(--muted)',
                          textTransform: 'uppercase',
                          letterSpacing: '0.06em',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {measurements.map((m, i) => {
                    const bmi = calculateBMI(m.weightKg, m.heightCm);
                    const cat = bmiCategory(bmi);
                    const trust = m.provenance?.trustLevel ?? 'self';
                    const trustInfo = trustLabelMap[trust] ?? trustLabelMap['self']!;
                    return (
                      <tr
                        key={m.id}
                        style={{
                          borderBottom: i < measurements.length - 1 ? '1px solid var(--border)' : 'none',
                          transition: 'background 0.1s',
                        }}
                        onMouseOver={(e) => { e.currentTarget.style.background = 'var(--surface2)'; }}
                        onMouseOut={(e) => { e.currentTarget.style.background = 'transparent'; }}
                      >
                        <td style={{ padding: '14px 16px', fontSize: '13px', color: 'var(--text)', whiteSpace: 'nowrap' }}>
                          {m.date}
                        </td>
                        <td style={{ padding: '14px 16px', fontSize: '14px', fontWeight: 600, color: 'var(--text)' }}>
                          {m.weightKg}
                        </td>
                        <td style={{ padding: '14px 16px', fontSize: '14px', color: 'var(--text)' }}>
                          {m.heightCm}
                        </td>
                        <td style={{ padding: '14px 16px', fontSize: '13px', color: 'var(--text)' }}>
                          <span>{bmi.toFixed(1)}</span>
                          <span style={{ fontSize: '11px', color: 'var(--muted)', marginLeft: '6px' }}>{cat}</span>
                        </td>
                        <td style={{ padding: '14px 16px', fontSize: '13px', color: 'var(--muted)' }}>
                          {m.bodyFatPct != null ? `${m.bodyFatPct}%` : '—'}
                        </td>
                        <td style={{ padding: '14px 16px', fontSize: '12px', color: 'var(--muted)' }}>
                          {m.bodyFatMethod ?? '—'}
                        </td>
                        <td style={{ padding: '14px 16px' }}>
                          <Badge variant={trustInfo.variant}>{trustInfo.label}</Badge>
                        </td>
                        <td style={{ padding: '14px 16px', fontSize: '12px', color: 'var(--muted)', maxWidth: '200px' }}>
                          <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {m.note ?? '—'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {/* BMI info */}
        <div
          style={{
            marginTop: '16px',
            fontSize: '11px',
            color: 'var(--muted)',
            lineHeight: 1.6,
          }}
        >
          BMI: &lt;18.5 Kurus · 18.5–24.9 Normal · 25–29.9 Gemuk · ≥30 Obesitas.
          Kategori BMI hanya untuk informasi, bukan diagnosis medis.
        </div>
      </PageWrapper>
    </AppShell>
  );
};
