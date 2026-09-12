import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const NAV = [
  { to: '/dashboard', label: 'Dashboard', icon: '🏠' },
  { to: '/leads',     label: 'Leads',     icon: '👥' },
  { to: '/campaigns', label: 'Campaigns', icon: '✉️' },
  { to: '/history',   label: 'History',   icon: '📜' },
  { to: '/logs',      label: 'Logs',      icon: '📊' },
  { to: '/users',     label: 'Users',     icon: '👤' },
];

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <div className="d-flex flex-column flex-md-row" style={{ minHeight: '100vh' }}>
      {/* Mobile top bar */}
      <div className="d-flex d-md-none align-items-center justify-content-between p-3 bg-white border-bottom sticky-top">
        <span className="fw-bold fs-5">✉️ BulkEmail</span>
        <button
          className="btn btn-outline-secondary btn-sm"
          type="button"
          onClick={() => setMobileMenuOpen(open => !open)}
          aria-label="Toggle navigation"
        >
          {mobileMenuOpen ? '✕ Close' : '☰ Menu'}
        </button>
      </div>

      {/* Navigation sidebar / mobile drawer */}
      <nav
        className={`d-md-flex flex-column flex-shrink-0 border-end bg-white ${mobileMenuOpen ? 'd-flex' : 'd-none d-md-flex'}`}
        style={{ width: '100%', maxWidth: 220, position: 'sticky', top: 0, height: '100vh' }}
      >
        <div className="px-3 py-4 border-bottom d-none d-md-block">
          <span className="fw-bold fs-5">✉️ BulkEmail</span>
        </div>

        <ul className="nav nav-pills flex-column gap-1 p-2 flex-grow-1 overflow-auto">
          {NAV.map(({ to, label, icon }) => (
            <li key={to} className="nav-item">
              <NavLink
                to={to}
                onClick={() => setMobileMenuOpen(false)}
                className={({ isActive }) =>
                  `nav-link d-flex align-items-center gap-2 ${isActive ? 'active' : 'text-dark'}`}
              >
                <span>{icon}</span>
                {label}
              </NavLink>
            </li>
          ))}
        </ul>

        <div className="border-top p-3">
          <div className="small fw-semibold text-truncate">
            {user?.username ? `@${user.username}` : user?.name || user?.email}
          </div>
          <div className="small text-muted text-truncate mb-2">{user?.email}</div>
          <button className="btn btn-outline-secondary btn-sm w-100" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </nav>

      <main className="flex-grow-1 bg-light" style={{ minWidth: 0, overflowX: 'auto' }}>
        {children}
      </main>
    </div>
  );
}
