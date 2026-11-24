import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Spinner } from '../components/ui/Spinner';

export const LoginPage = () => {
  const { login, isLoading } = useAuth();
  const [issuer, setIssuer] = useState('http://localhost:3001');
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async () => {
    setError(null);
    try {
      await login(issuer);
    } catch (e) {
      setError('Gagal masuk. Periksa server OIDC dan coba lagi.');
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--bg)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
      }}
    >
      {/* Background gradient blob */}
      <div
        style={{
          position: 'fixed',
          top: '-200px',
          right: '-200px',
          width: '600px',
          height: '600px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(255,255,255,0.05) 0%, transparent 70%)',
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          position: 'fixed',
          bottom: '-150px',
          left: '-150px',
          width: '500px',
          height: '500px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(217,119,87,0.08) 0%, transparent 70%)',
          pointerEvents: 'none',
        }}
      />

      <div style={{ width: '100%', maxWidth: '420px', position: 'relative' }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: '14px',
              background: 'var(--secondary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '24px',
              fontWeight: 700,
              color: 'white',
              margin: '0 auto 16px',
            }}
          >
            F
          </div>
          <h1 style={{ fontSize: '32px', fontWeight: 700, color: 'var(--text)', margin: '0 0 8px' }}>
            FitPod
          </h1>
          <p style={{ fontSize: '15px', color: 'var(--muted)', lineHeight: 1.5 }}>
            Data kebugaran Anda, kendali penuh Anda.
          </p>
        </div>

        {/* Login card */}
        <div
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: '16px',
            padding: '32px',
          }}
        >
          <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text)', marginBottom: '24px' }}>
            Masuk ke FitPod
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <Input
              label="Server Solid Pod (OIDC Issuer)"
              type="url"
              value={issuer}
              onChange={(e) => setIssuer(e.target.value)}
              placeholder="https://solidcommunity.net"
              disabled={isLoading}
            />

            {error && (
              <div
                style={{
                  background: 'rgba(239,68,68,0.1)',
                  border: '1px solid rgba(239,68,68,0.3)',
                  borderRadius: '8px',
                  padding: '10px 14px',
                  fontSize: '13px',
                  color: 'var(--danger)',
                }}
              >
                {error}
              </div>
            )}

            <Button
              variant="primary"
              size="lg"
              fullWidth
              onClick={handleLogin}
              disabled={isLoading || !issuer.trim()}
            >
              {isLoading ? <Spinner size={16} /> : null}
              {isLoading ? 'Menghubungkan...' : 'Masuk dengan Solid'}
            </Button>
          </div>

          {/* Common providers */}
          <div style={{ marginTop: '20px' }}>
            <p style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '8px', fontWeight: 500 }}>
              Provider umum:
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {[
                'https://solidcommunity.net',
                'https://inrupt.net',
                'http://localhost:3001',
              ].map((p) => (
                <button
                  key={p}
                  onClick={() => setIssuer(p)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    padding: '4px 0',
                    textAlign: 'left',
                    fontSize: '12px',
                    color: 'var(--secondary)',
                    cursor: 'pointer',
                    fontFamily: 'monospace',
                  }}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Solid Pod explanation */}
        <div
          style={{
            marginTop: '24px',
            padding: '20px',
            background: 'rgba(217,119,87,0.06)',
            border: '1px solid rgba(217,119,87,0.2)',
            borderRadius: '12px',
          }}
        >
          <h3 style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)', marginBottom: '8px' }}>
            Apa itu Solid Pod?
          </h3>
          <p style={{ fontSize: '12px', color: 'var(--muted)', lineHeight: 1.7 }}>
            Solid Pod adalah penyimpanan data pribadi yang terdesentralisasi. Data kebugaran Anda
            disimpan di Pod Anda sendiri — bukan di server FitPod. Anda memiliki kendali penuh:
            siapa yang bisa mengakses, kapan, dan untuk apa.
          </p>
        </div>

        <p style={{ textAlign: 'center', fontSize: '11px', color: 'var(--muted)', marginTop: '20px' }}>
          FitPod tidak menyimpan data Anda. Data tersimpan di Solid Pod Anda.
        </p>
      </div>
    </div>
  );
};
