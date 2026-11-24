import { NavLink, useLocation } from 'react-router-dom';
import { navItems } from './Sidebar';

export const TopBar = () => {
  const location = useLocation();

  return (
    <>
      {/* Mobile top header */}
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 50,
          background: 'var(--surface)',
          borderBottom: '1px solid var(--border)',
          padding: '12px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
        }}
        className="md:hidden"
      >
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: '7px',
            background: 'var(--secondary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '14px',
            fontWeight: 700,
            color: 'white',
          }}
        >
          F
        </div>
        <span style={{ fontWeight: 700, fontSize: '16px', color: 'var(--text)' }}>FitPod</span>
      </header>

      {/* Mobile bottom nav */}
      <nav
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 50,
          background: 'var(--surface)',
          borderTop: '1px solid var(--border)',
          display: 'flex',
          justifyContent: 'space-around',
          padding: '8px 0',
          paddingBottom: 'env(safe-area-inset-bottom, 8px)',
        }}
        className="md:hidden"
      >
        {navItems.slice(0, 5).map((item) => {
          const active = location.pathname === item.to || location.pathname.startsWith(item.to + '/');
          return (
            <NavLink
              key={item.to}
              to={item.to}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '3px',
                padding: '4px 8px',
                textDecoration: 'none',
                color: active ? 'var(--secondary)' : 'var(--muted)',
                fontSize: '10px',
                fontWeight: active ? 600 : 400,
              }}
            >
              {item.icon}
              {item.label}
            </NavLink>
          );
        })}
      </nav>
    </>
  );
};
