import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

export default function Login() {
  const [tab,      setTab]    = useState('login');
  const [name,     setName]   = useState('');
  const [username, setUname]  = useState('');
  const [email,    setEmail]  = useState('');
  const [ident,    setIdent]  = useState(''); // login: email OR username
  const [password, setPw]     = useState('');
  const [confirm,  setConfirm]= useState('');
  const [showPw,   setShowPw] = useState(false);
  const [error,    setError]  = useState('');
  const [loading,  setLoading]= useState(false);

  const { login } = useAuth();
  const navigate  = useNavigate();

  function switchTab(t) {
    setTab(t);
    setError('');
    setName(''); setUname(''); setEmail(''); setIdent(''); setPw(''); setConfirm('');
  }

  // Auto-generate username from display name as user types
  function handleNameChange(val) {
    setName(val);
    // Only auto-fill username if user hasn't manually edited it
    const auto = val.toLowerCase().trim().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 20);
    setUname(auto);
  }

  async function handleLogin(e) {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      // Send as 'identifier' — server accepts email or username
      const { data } = await api.post('/auth/login', { identifier: ident.trim(), password });
      localStorage.setItem('bea_token', data.token);
      localStorage.setItem('bea_user', JSON.stringify(data.user));
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed. Check your credentials.');
    } finally { setLoading(false); }
  }

  async function handleSignup(e) {
    e.preventDefault();
    setError('');
    if (!name.trim())         return setError('Please enter your display name.');
    if (!username.trim())     return setError('Please enter a username.');
    if (!/^[a-z0-9_]+$/.test(username)) return setError('Username can only contain letters, numbers, and underscores.');
    if (password.length < 8)  return setError('Password must be at least 8 characters.');
    if (password !== confirm)  return setError('Passwords do not match.');
    setLoading(true);
    try {
      const { data } = await api.post('/auth/seed-admin', {
        name:     name.trim(),
        username: username.trim(),
        email:    email.trim(),
        password,
      });
      localStorage.setItem('bea_token', data.token);
      localStorage.setItem('bea_user', JSON.stringify(data.user));
      window.location.href = '/dashboard';
    } catch (err) {
      const msg = err.response?.data?.error || 'Signup failed.';
      // If first user already exists, user must ask someone to add them
      if (err.response?.status === 403 || msg.includes('already exists') || msg.includes('disabled')) {
        setError('An account already exists. Ask an existing user to add you from the Users page, then sign in.');
      } else {
        setError(msg);
      }
    } finally { setLoading(false); }
  }

  return (
    <div className="d-flex align-items-center justify-content-center vh-100 bg-light">
      <div className="card shadow-sm" style={{ width: 430 }}>
        <div className="card-body p-4">
          <h4 className="mb-1 fw-bold">✉️ BulkEmail Manager</h4>
          <p className="text-muted small mb-4">Email blast control panel</p>

          {/* Tabs */}
          <ul className="nav nav-tabs mb-4">
            <li className="nav-item">
              <button
                className={`nav-link border-0 bg-transparent ${tab === 'login' ? 'active fw-semibold' : 'text-muted'}`}
                onClick={() => switchTab('login')}
              >Sign In</button>
            </li>
            <li className="nav-item">
              <button
                className={`nav-link border-0 bg-transparent ${tab === 'signup' ? 'active fw-semibold' : 'text-muted'}`}
                onClick={() => switchTab('signup')}
              >Create Account</button>
            </li>
          </ul>

          {error && <div className="alert alert-danger py-2 small mb-3">{error}</div>}

          {/* ── SIGN IN TAB ── */}
          {tab === 'login' && (
            <form onSubmit={handleLogin}>
              <div className="mb-3">
                <label className="form-label small fw-semibold">Email or Username</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="you@example.com  or  sneha_k"
                  value={ident}
                  onChange={(e) => setIdent(e.target.value)}
                  required
                  autoFocus
                />
                <div className="form-text">You can sign in with your email address or your @username.</div>
              </div>
              <div className="mb-4">
                <label className="form-label small fw-semibold">Password</label>
                <div className="input-group">
                  <input
                    type={showPw ? 'text' : 'password'}
                    className="form-control"
                    value={password}
                    onChange={(e) => setPw(e.target.value)}
                    required
                  />
                  <button type="button" className="btn btn-outline-secondary"
                    onClick={() => setShowPw(v => !v)}>{showPw ? '🙈' : '👁'}</button>
                </div>
              </div>
              <button className="btn btn-primary w-100" disabled={loading}>
                {loading ? <><span className="spinner-border spinner-border-sm me-2" />Signing in…</> : 'Sign In'}
              </button>
            </form>
          )}

          {/* ── CREATE ACCOUNT TAB ── */}
          {tab === 'signup' && (
            <form onSubmit={handleSignup}>
              <div className="mb-3">
                <label className="form-label small fw-semibold">Display Name</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. Sneha Sharma"
                  value={name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  required
                />
                <div className="form-text">This name appears in the blast logs.</div>
              </div>

              <div className="mb-3">
                <label className="form-label small fw-semibold">Username</label>
                <div className="input-group">
                  <span className="input-group-text text-muted">@</span>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="sneha_sharma"
                    value={username}
                    onChange={(e) => setUname(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                    required
                    maxLength={20}
                  />
                </div>
                <div className="form-text">Letters, numbers, underscores only. Used to sign in and shown in logs.</div>
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
                    placeholder="Min 8 characters"
                    value={password}
                    onChange={(e) => setPw(e.target.value)}
                    required
                    minLength={8}
                  />
                  <button type="button" className="btn btn-outline-secondary"
                    onClick={() => setShowPw(v => !v)}>{showPw ? '🙈' : '👁'}</button>
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
