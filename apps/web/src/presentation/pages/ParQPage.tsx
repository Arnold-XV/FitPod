import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppShell } from '../components/layout/AppShell';
import { PageWrapper } from '../components/layout/PageWrapper';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { container } from '@/app/container';

const QUESTIONS = [
  'Apakah dokter pernah mengatakan bahwa Anda memiliki penyakit jantung?',
  'Apakah Anda merasakan nyeri di dada saat melakukan aktivitas fisik?',
  'Apakah Anda pernah mengalami pusing atau pingsan?',
  'Apakah Anda sedang mengonsumsi obat untuk tekanan darah atau jantung?',
  'Apakah Anda memiliki masalah tulang atau sendi?',
  'Apakah dokter pernah menyarankan Anda untuk tidak berolahraga?',
  'Apakah Anda memiliki kondisi medis lain yang perlu dipertimbangkan?',
];

export const ParQPage = () => {
  const navigate = useNavigate();
  const [responses, setResponses] = useState<boolean[]>(new Array(7).fill(false));
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    setSaving(true);

    const useCase = await container.getSaveParQResponseUseCase();
    const result = await useCase({
      responses: {
        q1: responses[0] ?? false,
        q2: responses[1] ?? false,
        q3: responses[2] ?? false,
        q4: responses[3] ?? false,
        q5: responses[4] ?? false,
        q6: responses[5] ?? false,
        q7: responses[6] ?? false,
      },
      followUpCompleted: false,
    });

    if (result.ok) {
      navigate('/health');
    }

    setSaving(false);
  };

  return (
    <AppShell>
      <PageWrapper
        title="PAR-Q+ Screening"
        subtitle="Penilaian kesiapan aktivitas fisik"
      >
        <Card>
          <div style={{ marginBottom: '24px' }}>
            <p style={{ fontSize: '13px', color: 'var(--muted)', lineHeight: 1.6 }}>
              Jawab pertanyaan berikut dengan jujur untuk memastikan keamanan Anda saat berolahraga.
            </p>
          </div>

          {QUESTIONS.map((question, idx) => (
            <div
              key={idx}
              style={{
                padding: '16px',
                background: 'var(--surface2)',
                borderRadius: '8px',
                marginBottom: '12px',
              }}
            >
              <div style={{ fontSize: '13px', fontWeight: 500, marginBottom: '12px' }}>
                {idx + 1}. {question}
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  onClick={() => {
                    const newResponses = [...responses];
                    newResponses[idx] = true;
                    setResponses(newResponses);
                  }}
                  style={{
                    padding: '8px 24px',
                    borderRadius: '8px',
                    border: '1px solid var(--border)',
                    background: responses[idx] === true ? 'var(--warning)' : 'var(--surface)',
                    color: responses[idx] === true ? 'white' : 'var(--text)',
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontWeight: 500,
                  }}
                >
                  Ya
                </button>
                <button
                  onClick={() => {
                    const newResponses = [...responses];
                    newResponses[idx] = false;
                    setResponses(newResponses);
                  }}
                  style={{
                    padding: '8px 24px',
                    borderRadius: '8px',
                    border: '1px solid var(--border)',
                    background: responses[idx] === false ? 'var(--success)' : 'var(--surface)',
                    color: responses[idx] === false ? 'white' : 'var(--text)',
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontWeight: 500,
                  }}
                >
                  Tidak
                </button>
              </div>
            </div>
          ))}

          <div
            style={{
              padding: '16px',
              background: 'rgba(59,130,246,0.1)',
              border: '1px solid rgba(59,130,246,0.3)',
              borderRadius: '8px',
              marginTop: '16px',
            }}
          >
            <p style={{ fontSize: '13px', color: 'var(--muted)', lineHeight: 1.6 }}>
              PAR-Q+ adalah alat skrining kebugaran, bukan diagnosis medis. Selalu konsultasikan dengan tenaga kesehatan profesional untuk penilaian kesehatan yang komprehensif.
            </p>
          </div>

          <div style={{ marginTop: '24px', display: 'flex', gap: '12px' }}>
            <Button
              variant="primary"
              onClick={handleSubmit}
              disabled={saving}
            >
              {saving ? 'Menyimpan...' : 'Simpan Hasil'}
            </Button>
            <Button variant="secondary" onClick={() => navigate(-1)}>
              Batal
            </Button>
          </div>
        </Card>
      </PageWrapper>
    </AppShell>
  );
};
