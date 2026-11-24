import { useState } from 'react';
import { AppShell } from '../components/layout/AppShell';
import { PageWrapper } from '../components/layout/PageWrapper';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { EmptyState } from '../components/ui/EmptyState';

const HeartIcon = () => (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
  </svg>
);

const parqQuestions = [
  'Apakah dokter pernah mengatakan bahwa Anda memiliki kondisi jantung DAN menyarankan Anda hanya melakukan aktivitas fisik yang direkomendasikan oleh dokter?',
  'Apakah Anda merasakan nyeri dada saat melakukan aktivitas fisik?',
  'Dalam sebulan terakhir, apakah Anda pernah merasakan nyeri dada saat tidak melakukan aktivitas fisik?',
  'Apakah Anda kehilangan keseimbangan karena pusing atau pernah pingsan?',
  'Apakah Anda memiliki masalah tulang atau sendi yang bisa memburuk akibat perubahan aktivitas fisik?',
  'Apakah dokter saat ini meresepkan obat untuk tekanan darah atau kondisi jantung?',
  'Apakah Anda mengetahui alasan lain mengapa Anda sebaiknya tidak melakukan aktivitas fisik?',
];

type YesNo = 'yes' | 'no' | null;

const tabs = ['PAR-Q+', 'Clearance', 'Cedera & Kondisi'];

export const HealthPage = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [answers, setAnswers] = useState<YesNo[]>(parqQuestions.map(() => null));
  const [submitted, setSubmitted] = useState(false);

  const setAnswer = (i: number, val: YesNo) => {
    setAnswers((prev) => { const a = [...prev]; a[i] = val; return a; });
    if (submitted) setSubmitted(false);
  };

  const allAnswered = answers.every((a) => a !== null);
  const anyYes = answers.some((a) => a === 'yes');

  const handleSubmit = () => { setSubmitted(true); };

  return (
    <AppShell>
      <PageWrapper title="Kesehatan" subtitle="Skrining kebugaran dan pemantauan kondisi kesehatan.">
        {/* Tabs */}
        <div
          style={{
            display: 'flex',
            gap: '2px',
            padding: '4px',
            background: 'var(--surface)',
            borderRadius: '10px',
            marginBottom: '24px',
            width: 'fit-content',
            border: '1px solid var(--border)',
          }}
        >
          {tabs.map((tab, i) => (
            <button
              key={tab}
              onClick={() => setActiveTab(i)}
              style={{
                padding: '8px 20px',
                borderRadius: '7px',
                border: 'none',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: activeTab === i ? 600 : 400,
                background: activeTab === i ? 'var(--secondary)' : 'transparent',
                color: activeTab === i ? 'white' : 'var(--muted)',
                transition: 'all 0.15s',
                fontFamily: 'inherit',
              }}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* PAR-Q+ */}
        {activeTab === 0 && (
          <Card>
            <div style={{ marginBottom: '20px' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text)', marginBottom: '6px' }}>
                PAR-Q+ (Versi Sederhana)
              </h3>
              <p style={{ fontSize: '13px', color: 'var(--muted)', lineHeight: 1.6 }}>
                Jawab semua pertanyaan dengan jujur. Jika menjawab YA pada salah satu pertanyaan, konsultasikan dengan
                dokter atau profesional kesehatan sebelum meningkatkan aktivitas fisik Anda.
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {parqQuestions.map((q, i) => (
                <div
                  key={i}
                  style={{
                    padding: '16px',
                    background: 'var(--surface2)',
                    borderRadius: '10px',
                    border: `1px solid ${answers[i] === 'yes' ? 'rgba(239,68,68,0.3)' : 'var(--border)'}`,
                  }}
                >
                  <p style={{ fontSize: '14px', color: 'var(--text)', lineHeight: 1.6, marginBottom: '12px' }}>
                    <span style={{ color: 'var(--muted)', fontWeight: 600, marginRight: '8px' }}>{i + 1}.</span>
                    {q}
                  </p>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {(['yes', 'no'] as const).map((val) => (
                      <button
                        key={val}
                        onClick={() => setAnswer(i, val)}
                        style={{
                          padding: '6px 20px',
                          borderRadius: '6px',
                          border: `1px solid ${answers[i] === val ? (val === 'yes' ? 'var(--danger)' : 'var(--secondary)') : 'var(--border)'}`,
                          background: answers[i] === val
                            ? val === 'yes' ? 'rgba(239,68,68,0.15)' : 'rgba(217,119,87,0.15)'
                            : 'transparent',
                          color: answers[i] === val
                            ? val === 'yes' ? 'var(--danger)' : 'var(--secondary)'
                            : 'var(--muted)',
                          fontSize: '13px',
                          fontWeight: 600,
                          cursor: 'pointer',
                          fontFamily: 'inherit',
                          transition: 'all 0.15s',
                        }}
                      >
                        {val === 'yes' ? 'YA' : 'TIDAK'}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div style={{ marginTop: '20px', display: 'flex', gap: '12px', alignItems: 'center' }}>
              <Button
                variant="primary"
                onClick={handleSubmit}
                disabled={!allAnswered}
              >
                Simpan Hasil
              </Button>
              {submitted && (
                <div
                  style={{
                    padding: '10px 16px',
                    borderRadius: '8px',
                    background: anyYes ? 'rgba(239,68,68,0.1)' : 'rgba(217,119,87,0.1)',
                    border: `1px solid ${anyYes ? 'rgba(239,68,68,0.3)' : 'rgba(217,119,87,0.3)'}`,
                    fontSize: '13px',
                    color: anyYes ? 'var(--danger)' : 'var(--secondary)',
                  }}
                >
                  {anyYes
                    ? 'Anda menjawab YA pada ≥1 pertanyaan. Konsultasikan dengan dokter sebelum memulai program latihan baru.'
                    : 'Anda aman untuk memulai atau meningkatkan aktivitas fisik.'}
                </div>
              )}
            </div>

            <p style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '16px', lineHeight: 1.6 }}>
              PAR-Q+ adalah alat skrining kebugaran, bukan diagnosis medis. Selalu konsultasikan dengan
              tenaga kesehatan profesional untuk penilaian kesehatan yang komprehensif.
            </p>
          </Card>
        )}

        {/* Clearance */}
        {activeTab === 1 && (
          <Card>
            <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text)', marginBottom: '16px' }}>
              Clearance Medis
            </h3>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '16px',
                background: 'var(--surface2)',
                borderRadius: '10px',
                marginBottom: '16px',
              }}
            >
              <Badge variant="default">Belum Ada</Badge>
              <span style={{ fontSize: '14px', color: 'var(--muted)' }}>
                Clearance medis dari dokter atau fisioterapis belum diterima.
              </span>
            </div>
            <EmptyState
              icon={<HeartIcon />}
              title="Belum ada clearance medis"
              description="Clearance medis dari profesional kesehatan yang terhubung akan muncul di sini. Minta pelatih atau dokter Anda untuk menerbitkan clearance melalui FitPod."
            />
          </Card>
        )}

        {/* Injuries & Conditions */}
        {activeTab === 2 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <Card>
              <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text)', marginBottom: '16px' }}>
                Cedera Aktif
              </h3>
              <EmptyState
                icon={<HeartIcon />}
                title="Tidak ada cedera tercatat"
                description="Daftar cedera dan kondisi fisik yang perlu diperhatikan saat latihan akan muncul di sini."
              />
            </Card>
            <Card>
              <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text)', marginBottom: '16px' }}>
                Kondisi Kesehatan
              </h3>
              <EmptyState
                title="Tidak ada kondisi tercatat"
                description="Kondisi kesehatan kronis atau khusus yang relevan dengan program latihan Anda."
              />
            </Card>
          </div>
        )}
      </PageWrapper>
    </AppShell>
  );
};
