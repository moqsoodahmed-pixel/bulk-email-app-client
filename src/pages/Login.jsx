import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

export default function Login() {
  const [tab,      setTab]     = useState('login');
  const [name,     setName]    = useState('');
  const [email,    setEmail]   = useState('');
  const [password, setPw]      = useState('');
  const [confirm,  setConfirm] = useState('');
  const [showPw,   setShowPw]  = useState(false);
  const [error,    setError]   = useState('');
  const [info,     setInfo]    = useState('');
  const [loading,  setLoading] = useState(false);
  // null = unknown, true = admin exists, false = no admin yet
  const [adminExists, setAdminExists] = useState(null);

  const { login } = useAuth();
  const navigate  = useNavigate();

  function switchTab(t) {
    setTab(t);
    setError('');
    setInfo('');
    // Reset form fields
    setName(''); setEmail(''); setPw(''); setConfirm('');
    // Check admin status only when switching TO signup, and only once
    if (t === 'signup' && adminExists === null) {
      checkAdminExists();
    }
  }

  async function checkAdminExists() {
    try {
      // seed-admin returns 403 if admin exists, 200-range otherwise
      // We do a lightweight GET on /api/health and check user count via a dummy POST
      // Simplest: just try the seed-admin with dummy data — if 403 → admin exists
      await api.post('/auth/seed-admin', { _probe: true });
      // If we get here somehow, set false (shouldn't happen normally)
      setAdminExists(false);
    } catch (err) {
      const status = err.response?.status;
      const msg    = err.response?.data?.error || '';
      if (status === 403 || msg.includes('already exists') || msg.includes('disabled')) {
        setAdminExists(true);
      } else {
        // Any other error (400 = missing fields) means the endpoint is reachable
        // and admin does NOT exist yet (seed-admin rejected due to missing body, not due to existing admin)
        setAdminExists(false);
      }
    }
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
    setError(''); setInfo('');
    if (!name.trim())        return setError('Please enter your name.');
    if (password.length < 8) return setError('Password must be at least 8 characters.');
    if (password !== confirm) return setError('Passwords do not match.');
    setLoading(true);
    try {
      const { data } = await api.post('/auth/seed-admin', {
        name: name.trim(),
        email: email.trim(),
        password,
      });
      localStorage.setItem('bea_token', data.token);
      localStorage.setItem('bea_user', JSON.stringify(data.user));
      window.location.href = '/dashboard';
    } catch (err) {
      const status = err.response?.status;
      const msg    = err.response?.data?.error || 'Signup failed.';
      if (status === 403 || msg.includes('already exists') || msg.includes('disabled')) {
        setAdminExists(true);
        setError('');
      } else {
        setError(msg);
      }
    } finally { setLoading(false); }
  }

  return (
    <div className="d-flex align-items-center justify-content-center vh-100 bg-light">
      <div className="card shadow-sm" style={{ width: 420 }}>
        <div className="card-body p-4">
          <h4 className="mb-1 fw-bold">✉️ BulkEmail Manager</h4>
          <p className="text-muted small mb-4">Email blast control panel</p>

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

          {/* ── LOGIN TAB ── */}
          {tab === 'login' && (
            <>
              {error && <div className="alert alert-danger py-2 small mb-3">{error}</div>}
              <form onSubmit={handleLogin}>
                <div className="mb-3">
                  <label className="form-label small fw-semibold">Email</label>
                  <input type="email" className="form-control" placeholder="you@example.com"
                    value={email} onChange={(e) => setEmail(e.target.value)} required />
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
            </>
          )}

          {/* ── SIGNUP TAB ── */}
          {tab === 'signup' && (
            <>
              {/* Case 1: checking */}
              {adminExists === null && (
                <div className="text-center py-4 text-muted small">
                  <div className="spinner-border spinner-border-sm me-2" />
                  Checking setup status…
                </div>
              )}

              {/* Case 2: admin already exists — show message, no form */}
              {adminExists === true && (
                <div className="text-center py-3">
                  <div style={{ fontSize: 40 }}>🔒</div>
                  <h6 className="mt-3 fw-semibold">Admin account already set up</h6>
                  <p className="text-muted small mt-2 mb-3">
                    New user accounts are created by an existing admin.<br />
                    Ask your admin to add you from the <strong>Users</strong> page.
                  </p>
                  <button className="btn btn-outline-primary btn-sm" onClick={() => switchTab('login')}>
                    Go to Sign In →
                  </button>
                </div>
              )}

              {/* Case 3: no admin yet — show signup form */}
              {adminExists === false && (
                <>
                  <div className="alert alert-info py-2 small mb-3">
                    <strong>First-time setup.</strong> Create the first admin account.
                    After this, new users are added from the <strong>Users</strong> page.
                  </div>
                  {error && <div className="alert alert-danger py-2 small mb-3">{error}</div>}
                  <form onSubmit={handleSignup}>
                    <div className="mb-3">
                      <label className="form-label small fw-semibold">Your Name</label>
                      <input type="text" className="form-control" placeholder="e.g. Sneha"
                        value={name} onChange={(e) => setName(e.target.value)} required />
                    </div>
                    <div className="mb-3">
                      <label className="form-label small fw-semibold">Email</label>
                      <input type="email" className="form-control" placeholder="you@example.com"
                        value={email} onChange={(e) => setEmail(e.target.value)} required />
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
                          required minLength={8}
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
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
