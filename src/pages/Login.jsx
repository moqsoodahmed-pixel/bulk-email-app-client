import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

export default function Login() {
  const [tab,      setTab]    = useState('login');
  // login fields
  const [ident,    setIdent]  = useState('');
  const [loginPw,  setLoginPw]= useState('');
  // signup fields
  const [name,     setName]   = useState('');
  const [username, setUname]  = useState('');
  const [unameEdited, setUnameEdited] = useState(false);
  const [email,    setEmail]  = useState('');
  const [pw,       setPw]     = useState('');
  const [confirm,  setConfirm]= useState('');

  const [showPw,   setShowPw] = useState(false);
  const [error,    setError]  = useState('');
  const [loading,  setLoading]= useState(false);

  const navigate = useNavigate();

  function switchTab(t) {
    setTab(t); setError('');
  }

  // Auto-fill username from display name unless user has manually changed it
  function handleNameChange(val) {
    setName(val);
    if (!unameEdited) {
      const auto = val.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 20);
      setUname(auto);
    }
  }

  function handleUnameChange(val) {
    setUnameEdited(true);
    setUname(val.toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 20));
  }

  // ── LOGIN ──────────────────────────────────────────────────────────────
  async function handleLogin(e) {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const { data } = await api.post('/auth/login', {
        identifier: ident.trim(),
        password:   loginPw,
      });
      localStorage.setItem('bea_token', data.token);
      localStorage.setItem('bea_user',  JSON.stringify(data.user));
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed. Check your email/username and password.');
    } finally { setLoading(false); }
  }

  // ── SIGNUP ─────────────────────────────────────────────────────────────
  async function handleSignup(e) {
    e.preventDefault();
    setError('');
    if (!name.trim())                          return setError('Please enter your display name.');
    if (!username.trim())                      return setError('Please enter a username.');
    if (!/^[a-z0-9_]{2,20}$/.test(username))  return setError('Username: 2-20 chars, letters/numbers/underscores only.');
    if (!email.trim())                         return setError('Please enter your email.');
    if (pw.length < 8)                         return setError('Password must be at least 8 characters.');
    if (pw !== confirm)                        return setError('Passwords do not match.');

    setLoading(true);
    try {
      const { data } = await api.post('/auth/register', {
        name:     name.trim(),
        username: username.trim(),
        email:    email.trim(),
        password: pw,
      });
      localStorage.setItem('bea_token', data.token);
      localStorage.setItem('bea_user',  JSON.stringify(data.user));
      navigate('/dashboard');
    } catch (err) {
      const msg = err.response?.data?.error || 'Signup failed. Please try again.';
      // If username taken, show the server's suggestion
      if (err.response?.data?.suggestion) {
        setUname(err.response.data.suggestion);
        setUnameEdited(true);
      }
      setError(msg);
    } finally { setLoading(false); }
  }

  return (
    <div className="d-flex align-items-center justify-content-center vh-100 bg-light">
      <div className="card shadow-sm" style={{ width: 430 }}>
        <div className="card-body p-4">

          <h4 className="mb-1 fw-bold">✉️ BulkEmail Manager</h4>
          <p className="text-muted small mb-4">Email blast control panel</p>

          {/* ── TABS ── */}
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

          {error && (
            <div className="alert alert-danger py-2 small mb-3" role="alert">{error}</div>
          )}

          {/* ── SIGN IN ── */}
          {tab === 'login' && (
            <form onSubmit={handleLogin} noValidate>
              <div className="mb-3">
                <label className="form-label small fw-semibold">Email or Username</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="you@example.com  or  sneha_k"
                  value={ident}
                  onChange={(e) => setIdent(e.target.value)}
                  autoFocus
                  required
                />
                <div className="form-text">Sign in with your email address or your @username.</div>
              </div>
              <div className="mb-4">
                <label className="form-label small fw-semibold">Password</label>
                <div className="input-group">
                  <input
                    type={showPw ? 'text' : 'password'}
                    className="form-control"
                    value={loginPw}
                    onChange={(e) => setLoginPw(e.target.value)}
                    required
                  />
                  <button type="button" className="btn btn-outline-secondary"
                    onClick={() => setShowPw(v => !v)}>
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

          {/* ── CREATE ACCOUNT ── */}
          {tab === 'signup' && (
            <form onSubmit={handleSignup} noValidate>
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
                <div className="form-text">Shown in blast logs to identify who triggered the blast.</div>
              </div>

              <div className="mb-3">
                <label className="form-label small fw-semibold">Username</label>
                <div className="input-group">
                  <span className="input-group-text">@</span>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="sneha_sharma"
                    value={username}
                    onChange={(e) => handleUnameChange(e.target.value)}
                    required
                    maxLength={20}
                  />
                </div>
                <div className="form-text">2–20 chars, letters/numbers/underscores. Used to sign in.</div>
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
                    value={pw}
                    onChange={(e) => setPw(e.target.value)}
                    required
                    minLength={8}
                  />
                  <button type="button" className="btn btn-outline-secondary"
                    onClick={() => setShowPw(v => !v)}>
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
