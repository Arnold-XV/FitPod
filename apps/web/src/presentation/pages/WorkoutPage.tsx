import { useState } from 'react';
import { AppShell } from '../components/layout/AppShell';
import { PageWrapper } from '../components/layout/PageWrapper';
import { Card } from '../components/ui/Card';
import { EmptyState } from '../components/ui/EmptyState';

const DumbbellIcon = () => (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6.5 6.5h11M6.5 17.5h11M3 9.5h18M3 14.5h18" />
  </svg>
);

const tabs = ['Sesi', 'Rutinitas'];

export const WorkoutPage = () => {
  const [activeTab, setActiveTab] = useState(0);

  return (
    <AppShell>
      <PageWrapper title="Latihan" subtitle="Catat sesi dan kelola rutinitas latihan Anda.">
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

        <Card>
          <EmptyState
            icon={<DumbbellIcon />}
            title={activeTab === 0 ? 'Belum ada sesi tercatat' : 'Belum ada rutinitas'}
            description={
              activeTab === 0
                ? 'Segera hadir — pencatatan sesi workout dengan set, repetisi, dan beban.'
                : 'Segera hadir — buat dan kelola rutinitas latihan mingguan Anda.'
            }
          />
        </Card>
      </PageWrapper>
    </AppShell>
  );
};
