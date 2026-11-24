import { useState } from 'react';
import { AppShell } from '../components/layout/AppShell';
import { PageWrapper } from '../components/layout/PageWrapper';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { EmptyState } from '../components/ui/EmptyState';

const UsersIcon = () => (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

const tabs = ['Beranda', 'Teman'];

export const SocialPage = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [friendWebId, setFriendWebId] = useState('');

  return (
    <AppShell>
      <PageWrapper title="Sosial" subtitle="Hubungkan dengan teman dan pantau progress bersama.">
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

        {activeTab === 0 && (
          <Card>
            <EmptyState
              icon={<UsersIcon />}
              title="Feed kosong"
              description="Tambahkan teman untuk melihat aktivitas mereka di sini. Privasi tetap terjaga — teman hanya melihat apa yang Anda izinkan."
            />
          </Card>
        )}

        {activeTab === 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Add friend */}
            <Card>
              <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text)', marginBottom: '16px' }}>
                Tambah Teman via WebID
              </h3>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-end' }}>
                <div style={{ flex: 1 }}>
                  <Input
                    label="WebID teman"
                    type="url"
                    placeholder="https://alice.solidcommunity.net/profile/card#me"
                    value={friendWebId}
                    onChange={(e) => setFriendWebId(e.target.value)}
                  />
                </div>
                <Button variant="primary" disabled={!friendWebId.trim()}>
                  Kirim Permintaan
                </Button>
              </div>
              <p style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '10px' }}>
                Fitur permintaan pertemanan segera hadir.
              </p>
            </Card>

            {/* Friends list */}
            <Card>
              <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text)', marginBottom: '16px' }}>
                Daftar Teman
              </h3>
              <EmptyState
                icon={<UsersIcon />}
                title="Belum ada teman"
                description="Tambahkan teman menggunakan WebID mereka untuk terhubung."
              />
            </Card>
          </div>
        )}
      </PageWrapper>
    </AppShell>
  );
};
