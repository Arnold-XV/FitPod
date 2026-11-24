import type { ReactNode } from 'react';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';

interface AppShellProps {
  children: ReactNode;
}

export const AppShell = ({ children }: AppShellProps) => {
  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg)' }}>
      {/* Desktop sidebar */}
      <div
        style={{ display: 'flex' }}
        className="hidden md:flex"
      >
        <Sidebar />
      </div>

      {/* Main area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* Mobile top bar + bottom nav */}
        <TopBar />

        {/* Page content */}
        <main style={{ flex: 1, overflowY: 'auto' }}>
          {children}
        </main>
      </div>
    </div>
  );
};
