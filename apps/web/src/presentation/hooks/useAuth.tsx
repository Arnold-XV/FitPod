import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { container } from '@/app/container';

interface AuthContextValue {
  webId: string | null;
  isLoggedIn: boolean;
  isLoading: boolean;
  login: (issuer: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [webId, setWebId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const restore = async () => {
      try {
        const result = await container.authSession.restore();
        if (result?.webId) {
          setWebId(result.webId);
          
          // Setup inbox on first login (non-blocking)
          try {
            const setupInboxUseCase = await container.getSetupInboxUseCase();
            await setupInboxUseCase();
          } catch (error) {
            console.warn('Failed to setup inbox:', error);
          }
          
          // Navigate to dashboard unless already on a protected page
          const publicPaths = ['/', '/login'];
          if (publicPaths.includes(window.location.pathname)) {
            navigate('/dashboard', { replace: true });
          }
        }
      } catch {
        // no existing session
      } finally {
        setIsLoading(false);
      }
    };
    restore();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const login = useCallback(async (issuer: string) => {
    // solidLogin() redirects the browser — this function never returns normally
    const loginUseCase = await container.getLoginUseCase();
    await loginUseCase(issuer);
    // If we reach here (should not happen on redirect), check webId
    const id = container.authSession.webId;
    if (id) setWebId(id);
  }, []);

  const logout = useCallback(async () => {
    setIsLoading(true);
    try {
      const logoutUseCase = await container.getLogoutUseCase();
      await logoutUseCase();
      await container.resetRepositories();
      setWebId(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return (
    <AuthContext.Provider value={{ webId, isLoggedIn: !!webId, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextValue => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
