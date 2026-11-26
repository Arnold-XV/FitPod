import { useState, useEffect } from 'react';
import { AppShell } from '../components/layout/AppShell';
import { PageWrapper } from '../components/layout/PageWrapper';
import { Card } from '../components/ui/Card';
import { EmptyState } from '../components/ui/EmptyState';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { container } from '@/app/container';
import type { ClientAccess } from '@/domain/professional/entities';

const UsersIcon = () => (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

export const ProfessionalDashboardPage = () => {
  const [clients, setClients] = useState<ClientAccess[]>([]);
  const [loading, setLoading] = useState(true);
  const [newClientWebId, setNewClientWebId] = useState('');
  const [registering, setRegistering] = useState(false);
  const [registerError, setRegisterError] = useState<string | undefined>();

  useEffect(() => {
    loadClients();
  }, []);

  const loadClients = async () => {
    setLoading(true);
    const useCase = await container.getListClientsUseCase();
    const result = await useCase();
    
    if (result.ok) {
      setClients(result.value);
    }
    
    setLoading(false);
  };

  const handleRegisterClient = async () => {
    if (!newClientWebId.trim()) return;
    
    setRegistering(true);
    setRegisterError(undefined);
    
    const useCase = await container.getRegisterClientUseCase();
    const result = await useCase(newClientWebId.trim());
    
    if (result.ok) {
      setNewClientWebId('');
      await loadClients();
    } else {
      setRegisterError(result.error.message);
    }
    
    setRegistering(false);
  };

  return (
    <AppShell>
      <PageWrapper
        title="Dashboard Profesional"
        subtitle="Kelola klien yang memberikan akses ke data mereka."
      >
        {/* Stats overview */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '16px',
            marginBottom: '24px',
          }}
        >
          <Card>
            <div style={{ fontSize: '13px', color: 'var(--muted)', marginBottom: '8px' }}>
              Total Klien
            </div>
            <div style={{ fontSize: '28px', fontWeight: 700, color: 'var(--text)' }}>
              {clients.length}
            </div>
          </Card>

          <Card>
            <div style={{ fontSize: '13px', color: 'var(--muted)', marginBottom: '8px' }}>
              Akses Aktif
            </div>
            <div style={{ fontSize: '28px', fontWeight: 700, color: 'var(--text)' }}>
              {clients.filter((c) => !c.expiresAt || new Date(c.expiresAt) > new Date()).length}
            </div>
          </Card>
        </div>

        {/* Client registration form */}
        <Card>
          <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text)', marginBottom: '20px' }}>
            Tambah Klien
          </h3>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
            <div style={{ flex: 1 }}>
              <Input
                type="url"
                placeholder="https://client.solidcommunity.net/profile/card#me"
                value={newClientWebId}
                onChange={(e) => setNewClientWebId(e.target.value)}
                error={registerError}
              />
            </div>
            <Button
              variant="primary"
              onClick={handleRegisterClient}
              disabled={!newClientWebId.trim() || registering}
            >
              {registering ? 'Menambahkan...' : 'Tambah'}
            </Button>
          </div>
          <p style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '8px' }}>
            Tambahkan WebID klien yang telah memberikan akses kepada Anda. Sistem akan memeriksa
            grant di Pod mereka.
          </p>
        </Card>

        {/* Client list */}
        <Card>
          <h3
            style={{
              fontSize: '15px',
              fontWeight: 600,
              color: 'var(--text)',
              marginBottom: '20px',
            }}
          >
            Daftar Klien
          </h3>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--muted)' }}>
              Memuat...
            </div>
          ) : clients.length === 0 ? (
            <EmptyState
              icon={<UsersIcon />}
              title="Belum ada klien"
              description="Klien yang memberikan akses kepada Anda akan muncul di sini."
            />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {clients.map((client) => (
                <div
                  key={client.grantId}
                  style={{
                    padding: '14px 16px',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text)' }}>
                      {client.clientName || 'Klien'}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '4px' }}>
                      {client.clientWebId}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '4px' }}>
                      Akses: {client.scope.join(', ')} • {client.permissions}
                    </div>
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--muted)' }}>
                    {client.expiresAt
                      ? `Kadaluarsa: ${new Date(client.expiresAt).toLocaleDateString('id-ID')}`
                      : 'Tanpa batas waktu'}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Info card */}
        <div
          style={{
            marginTop: '24px',
            padding: '16px',
            background: 'rgba(59,130,246,0.08)',
            border: '1px solid rgba(59,130,246,0.2)',
            borderRadius: '10px',
            fontSize: '13px',
            color: 'var(--muted)',
            lineHeight: 1.6,
          }}
        >
          <strong>Catatan:</strong> Dashboard ini menampilkan klien yang telah memberikan akses
          kepada Anda. Untuk melihat data detail klien, klik nama klien (fitur segera hadir).
        </div>
      </PageWrapper>
    </AppShell>
  );
};
