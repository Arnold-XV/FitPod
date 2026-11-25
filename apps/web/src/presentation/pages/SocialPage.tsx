import { useState, useEffect } from 'react';
import { AppShell } from '../components/layout/AppShell';
import { PageWrapper } from '../components/layout/PageWrapper';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { EmptyState } from '../components/ui/EmptyState';
import { container } from '@/app/container';
import { useAuth } from '../hooks/useAuth';
import type { Connection, FriendRequest, SharedActivity } from '@/domain/social/entities';

const UsersIcon = () => (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

const tabs = ['Beranda', 'Teman', 'Permintaan'];

export const SocialPage = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [friendWebId, setFriendWebId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [feed, setFeed] = useState<SharedActivity[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [incomingRequests, setIncomingRequests] = useState<FriendRequest[]>([]);
  const [outgoingRequests, setOutgoingRequests] = useState<Connection[]>([]);

  const { webId } = useAuth();

  // Load data on mount and tab change
  useEffect(() => {
    if (!webId) return;
    
    // Setup inbox on first visit to social page (non-blocking)
    const setupInbox = async () => {
      try {
        const setupUseCase = await container.getSetupInboxUseCase();
        await setupUseCase();
      } catch (error) {
        console.warn('Failed to setup inbox:', error);
      }
    };
    setupInbox();
    
    if (activeTab === 0) {
      loadFeed();
    } else if (activeTab === 1) {
      loadConnections();
    } else if (activeTab === 2) {
      loadRequests();
    }
  }, [activeTab, webId]);

  // Acceptance lives in sender's inbox. Poll it from every Social tab so a
  // sender's connections.ttl is updated even when they never open Requests.
  useEffect(() => {
    if (!webId) return;
    let disposed = false;

    const syncAcceptedConnections = async () => {
      try {
        const inboxUseCase = await container.getListIncomingRequestsUseCase();
        const inboxResult = await inboxUseCase();
        if (!inboxResult.ok || disposed) return;

        const connectionsUseCase = await container.getListConnectionsUseCase();
        const connectionsResult = await connectionsUseCase();
        if (!connectionsResult.ok || disposed) return;

        setConnections(connectionsResult.value.filter(c => c.status === 'accepted'));
        setOutgoingRequests(connectionsResult.value.filter(c => c.status === 'pending' && c.direction === 'outgoing'));
      } catch (error) {
        console.warn('[SocialPage] Acceptance sync failed:', error);
      }
    };

    void syncAcceptedConnections();
    const timer = window.setInterval(() => void syncAcceptedConnections(), 10_000);
    return () => {
      disposed = true;
      window.clearInterval(timer);
    };
  }, [webId]);

  const loadFeed = async () => {
    setLoading(true);
    setError(null);
    try {
      const useCase = await container.GetSocialFeedUseCase();
      const result = await useCase();
      
      if (result.ok) {
        setFeed(result.value);
      } else {
        setError(result.error.message);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load feed');
    } finally {
      setLoading(false);
    }
  };

  const loadConnections = async () => {
    setLoading(true);
    setError(null);
    try {
      // First, process inbox to auto-accept any acceptance notifications
      const inboxUseCase = await container.getListIncomingRequestsUseCase();
      await inboxUseCase(); // This triggers auto-processing of acceptance notifications
      
      const useCase = await container.getListConnectionsUseCase();
      const result = await useCase();
      
      if (result.ok) {
        const accepted = result.value.filter(c => c.status === 'accepted');
        setConnections(accepted);
        
        const outgoing = result.value.filter(c => c.status === 'pending' && c.direction === 'outgoing');
        setOutgoingRequests(outgoing);
      } else {
        setError(result.error.message);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load connections');
    } finally {
      setLoading(false);
    }
  };

  const loadRequests = async () => {
    setLoading(true);
    setError(null);
    try {
      const useCase = await container.getListIncomingRequestsUseCase();
      const result = await useCase();
      
      if (result.ok) {
        setIncomingRequests(result.value);
      } else {
        setError(result.error.message);
      }
      
      // Also load outgoing
      await loadConnections();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load requests');
    } finally {
      setLoading(false);
    }
  };

  const handleSendRequest = async () => {
    if (!friendWebId.trim()) return;

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const useCase = await container.getSendFriendRequestUseCase();
      const result = await useCase({ toWebId: friendWebId.trim() });

      if (result.ok) {
        setSuccess('Permintaan pertemanan terkirim');
        setFriendWebId('');
        await loadConnections(); // Refresh to show in outgoing
      } else {
        setError(result.error.message);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send request');
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptRequest = async (request: FriendRequest) => {
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const useCase = await container.getAcceptFriendRequestUseCase();
      const result = await useCase({ 
        requestId: request.id, 
        fromWebId: request.fromWebId 
      });

      if (result.ok) {
        setSuccess('Permintaan diterima');
        await loadRequests(); // Refresh
      } else {
        setError(result.error.message);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to accept request');
    } finally {
      setLoading(false);
    }
  };

  const handleRejectRequest = async (request: FriendRequest) => {
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const useCase = await container.getRejectFriendRequestUseCase();
      const result = await useCase({ 
        requestId: request.id, 
        fromWebId: request.fromWebId 
      });

      if (result.ok) {
        setSuccess('Permintaan ditolak');
        await loadRequests(); // Refresh
      } else {
        setError(result.error.message);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reject request');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveConnection = async (peerWebId: string) => {
    if (!window.confirm('Hapus teman ini? Data tidak dapat dikembalikan.')) return;

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const repo = await container.getSocialRepository();
      
      // Remove from local connections
      const result = await repo.removeConnection(peerWebId);
      if (!result.ok) {
        setError(result.error.message);
        setLoading(false);
        return;
      }

      // Send remove notification to peer
      if (webId) {
        const notifyResult = await repo.sendRemoveNotification(peerWebId, webId);
        if (!notifyResult.ok) {
          console.warn('Failed to notify peer about removal:', notifyResult.error);
          // Continue anyway - local removal succeeded
        }
      }

      setSuccess('Teman berhasil dihapus');
      await loadConnections(); // Refresh
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove connection');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelRequest = async (peerWebId: string) => {
    if (!window.confirm('Batalkan permintaan pertemanan?')) return;

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const repo = await container.getSocialRepository();
      
      // Remove from local connections
      const result = await repo.removeConnection(peerWebId);
      if (!result.ok) {
        setError(result.error.message);
        setLoading(false);
        return;
      }

      // Send cancel notification to peer (same as remove)
      if (webId) {
        const notifyResult = await repo.sendRemoveNotification(peerWebId, webId);
        if (!notifyResult.ok) {
          console.warn('Failed to notify peer about cancellation:', notifyResult.error);
        }
      }

      setSuccess('Permintaan dibatalkan');
      await loadConnections(); // Refresh
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to cancel request');
    } finally {
      setLoading(false);
    }
  };

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

        {/* Error / Success Messages */}
        {error && (
          <div style={{ 
            padding: '12px 16px', 
            background: 'var(--danger)', 
            color: 'white', 
            borderRadius: '8px', 
            marginBottom: '20px',
            fontSize: '14px'
          }}>
            {error}
          </div>
        )}

        {success && (
          <div style={{ 
            padding: '12px 16px', 
            background: 'var(--secondary)', 
            color: 'white', 
            borderRadius: '8px', 
            marginBottom: '20px',
            fontSize: '14px'
          }}>
            {success}
          </div>
        )}

        {/* Tab: Beranda (Feed) */}
        {activeTab === 0 && (
          <Card>
            {loading ? (
              <div style={{ textAlign: 'center', padding: '40px', color: 'var(--muted)' }}>
                Memuat feed...
              </div>
            ) : feed.length === 0 ? (
              <EmptyState
                icon={<UsersIcon />}
                title="Feed kosong"
                description="Tambahkan teman untuk melihat aktivitas mereka di sini. Privasi tetap terjaga — teman hanya melihat apa yang Anda izinkan."
              />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {feed.map((activity) => (
                  <div
                    key={activity.id}
                    style={{
                      padding: '16px',
                      border: '1px solid var(--border)',
                      borderRadius: '8px',
                      background: 'var(--surface2)',
                    }}
                  >
                    <div style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '6px' }}>
                      {activity.authorWebId.split('/')[2]} • {activity.date}
                    </div>
                    <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text)', marginBottom: '8px' }}>
                      {activity.title}
                    </div>
                    <div style={{ fontSize: '13px', color: 'var(--muted)' }}>
                      {activity.durationMin} min • {activity.totalVolumeKg} kg total volume
                    </div>
                    {activity.exerciseNames.length > 0 && (
                      <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '6px' }}>
                        {activity.exerciseNames.join(', ')}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>
        )}

        {/* Tab: Teman (Connections) */}
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
                    disabled={loading}
                  />
                </div>
                <Button 
                  variant="primary" 
                  disabled={!friendWebId.trim() || loading}
                  onClick={handleSendRequest}
                >
                  {loading ? 'Mengirim...' : 'Kirim Permintaan'}
                </Button>
              </div>
            </Card>

            {/* Friends list */}
            <Card>
              <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text)', marginBottom: '16px' }}>
                Daftar Teman ({connections.length})
              </h3>
              {loading ? (
                <div style={{ textAlign: 'center', padding: '20px', color: 'var(--muted)' }}>
                  Memuat...
                </div>
              ) : connections.length === 0 ? (
                <EmptyState
                  icon={<UsersIcon />}
                  title="Belum ada teman"
                  description="Tambahkan teman menggunakan WebID mereka untuk terhubung."
                />
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {connections.map((conn) => (
                    <div
                      key={conn.id}
                      style={{
                        padding: '12px',
                        border: '1px solid var(--border)',
                        borderRadius: '8px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <div>
                        <div style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text)' }}>
                          {conn.peerWebId.split('/')[2]}
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--muted)' }}>
                          Berteman sejak {conn.since}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={loading}
                        onClick={() => handleRemoveConnection(conn.peerWebId)}
                      >
                        Hapus
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {/* Outgoing requests */}
            {outgoingRequests.length > 0 && (
              <Card>
                <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text)', marginBottom: '16px' }}>
                  Permintaan Terkirim ({outgoingRequests.length})
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {outgoingRequests.map((req) => (
                    <div
                      key={req.id}
                      style={{
                        padding: '12px',
                        border: '1px solid var(--border)',
                        borderRadius: '8px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <div>
                        <div style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text)' }}>
                          {req.peerWebId.split('/')[2]}
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--muted)' }}>
                          Menunggu konfirmasi
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={loading}
                        onClick={() => handleCancelRequest(req.peerWebId)}
                      >
                        Batalkan
                      </Button>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </div>
        )}

        {/* Tab: Permintaan (Incoming Requests) */}
        {activeTab === 2 && (
          <Card>
            <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text)', marginBottom: '16px' }}>
              Permintaan Masuk ({incomingRequests.length})
            </h3>
            {loading ? (
              <div style={{ textAlign: 'center', padding: '20px', color: 'var(--muted)' }}>
                Memuat...
              </div>
            ) : incomingRequests.length === 0 ? (
              <EmptyState
                icon={<UsersIcon />}
                title="Tidak ada permintaan"
                description="Permintaan pertemanan dari orang lain akan muncul di sini."
              />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {incomingRequests.map((request) => (
                  <div
                    key={request.id}
                    style={{
                      padding: '14px',
                      border: '1px solid var(--border)',
                      borderRadius: '8px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text)' }}>
                        {request.fromWebId.split('/')[2]}
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--muted)' }}>
                        {new Date(request.createdAt).toLocaleDateString('id-ID')}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <Button
                        variant="primary"
                        size="sm"
                        disabled={loading}
                        onClick={() => handleAcceptRequest(request)}
                      >
                        Terima
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={loading}
                        onClick={() => handleRejectRequest(request)}
                      >
                        Tolak
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        )}
      </PageWrapper>
    </AppShell>
  );
};
