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

  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <div className="d-flex" style={{ minHeight: '100vh' }}>
      <nav className="d-flex flex-column flex-shrink-0 border-end bg-white"
        style={{ width: 220, position: 'sticky', top: 0, height: '100vh' }}>
        <div className="px-3 py-4 border-bottom">
          <span className="fw-bold fs-5">✉️ BulkEmail</span>
        </div>

        <ul className="nav nav-pills flex-column gap-1 p-2 flex-grow-1">
          {NAV.map(({ to, label, icon }) => (
            <li key={to} className="nav-item">
              <NavLink to={to}
                className={({ isActive }) =>
                  `nav-link d-flex align-items-center gap-2 ${isActive ? 'active' : 'text-dark'}`}>
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

      <main className="flex-grow-1 bg-light" style={{ minWidth: 0 }}>
        {children}
      </main>
    </div>
  );
}
