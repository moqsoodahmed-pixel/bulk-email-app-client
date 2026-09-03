import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

export default function Login() {
  const [tab,       setTab]      = useState('login'); // 'login' | 'signup'
  const [name,      setName]     = useState('');
  const [email,     setEmail]    = useState('');
  const [password,  setPassword] = useState('');
  const [confirm,   setConfirm]  = useState('');
  const [showPw,    setShowPw]   = useState(false);
  const [error,     setError]    = useState('');
  const [loading,   setLoading]  = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  function switchTab(t) {
    setTab(t);
    setError('');
    setName(''); setEmail(''); setPassword(''); setConfirm('');
  }

  async function handleLogin(e) {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed. Check your email and password.');
    } finally { setLoading(false); }
  }

  async function handleSignup(e) {
    e.preventDefault();
    setError('');
    if (!name.trim())             return setError('Please enter your name.');
    if (password.length < 8)      return setError('Password must be at least 8 characters.');
    if (password !== confirm)     return setError('Passwords do not match.');
    setLoading(true);
    try {
      // Create user via admin API — works because any existing admin can also
      // hit /api/auth/users, but here we use seed-admin for the very first user.
      // For subsequent users the admin creates them from the Users page.
      // This signup tab calls seed-admin (works only when zero users exist)
      // or the shared /api/auth/users endpoint with an invite token if you add one.
      // Current setup: signup only works when NO admin exists yet (first-time setup).
      const { data } = await api.post('/auth/seed-admin', {
        name: name.trim(),
        email: email.trim(),
        password,
      });
      // Auto-login after signup
      localStorage.setItem('bea_token', data.token);
      localStorage.setItem('bea_user', JSON.stringify(data.user));
      window.location.href = '/dashboard';
    } catch (err) {
      const msg = err.response?.data?.error || 'Signup failed.';
      // If seed-admin is disabled (admin exists), explain what to do
      if (msg.includes('already exists') || msg.includes('disabled')) {
        setError('An admin already exists. Ask your admin to create your account from the Users page.');
      } else {
        setError(msg);
      }
    } finally { setLoading(false); }
  }

  return (
    <div className="d-flex align-items-center justify-content-center vh-100 bg-light">
      <div className="card shadow-sm" style={{ width: 400 }}>
        <div className="card-body p-4">
          <h4 className="mb-1 fw-bold">✉️ BulkEmail Manager</h4>
          <p className="text-muted small mb-4">Email blast control panel</p>

          {/* Tabs */}
          <ul className="nav nav-tabs mb-4">
            <li className="nav-item">
              <button
                className={`nav-link ${tab === 'login' ? 'active fw-semibold' : 'text-muted'}`}
                onClick={() => switchTab('login')}
              >
                Sign In
              </button>
            </li>
            <li className="nav-item">
              <button
                className={`nav-link ${tab === 'signup' ? 'active fw-semibold' : 'text-muted'}`}
                onClick={() => switchTab('signup')}
              >
                Create Account
              </button>
            </li>
          </ul>

          {error && (
            <div className="alert alert-danger py-2 small mb-3">{error}</div>
          )}

          {/* ── LOGIN ── */}
          {tab === 'login' && (
            <form onSubmit={handleLogin}>
              <div className="mb-3">
                <label className="form-label small fw-semibold">Email</label>
                <input
                  type="email"
                  className="form-control"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="mb-4">
                <label className="form-label small fw-semibold">Password</label>
                <div className="input-group">
                  <input
                    type={showPw ? 'text' : 'password'}
                    className="form-control"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    onClick={() => setShowPw((v) => !v)}
                  >
                    {showPw ? '🙈' : '👁'}
                  </button>
                </div>
              </div>
              <button className="btn btn-primary w-100" disabled={loading}>
                {loading
                  ? <><span className="spinner-border spinner-border-sm me-2" />Signing in…</>
                  : 'Sign In'}
              </button>
            </form>
          )}

          {/* ── SIGNUP ── */}
          {tab === 'signup' && (
            <form onSubmit={handleSignup}>
              <div className="alert alert-info py-2 small mb-3">
                <strong>First-time setup only.</strong> Once an admin exists, new users are added
                from the <strong>Users</strong> page by an existing admin.
              </div>
              <div className="mb-3">
                <label className="form-label small fw-semibold">Your Name</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. Sneha"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
              <div className="mb-3">
                <label className="form-label small fw-semibold">Email</label>
                <input
                  type="email"
                  className="form-control"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="mb-3">
                <label className="form-label small fw-semibold">Password</label>
                <div className="input-group">
                  <input
                    type={showPw ? 'text' : 'password'}
                    className="form-control"
                    placeholder="Min 10 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={10}
                  />
                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    onClick={() => setShowPw((v) => !v)}
                  >
                    {showPw ? '🙈' : '👁'}
                  </button>
                </div>
              </div>
              <div className="mb-4">
                <label className="form-label small fw-semibold">Confirm Password</label>
                <input
                  type={showPw ? 'text' : 'password'}
                  className="form-control"
                  placeholder="Repeat password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  required
                />
              </div>
              <button className="btn btn-success w-100" disabled={loading}>
                {loading
                  ? <><span className="spinner-border spinner-border-sm me-2" />Creating account…</>
                  : 'Create Account & Sign In'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
