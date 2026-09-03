import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

function fmt(dateStr) {
  if (!dateStr) return 'Never';
  return new Date(dateStr).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true,
  });
}

// ---------------------------------------------------------------------------
// Add User Modal
// ---------------------------------------------------------------------------
function AddUserModal({ onClose, onCreated }) {
  const [form,    setForm]    = useState({ name: '', email: '', password: '', confirm: '' });
  const [error,   setError]   = useState('');
  const [loading, setLoading] = useState(false);
  const [showPw,  setShowPw]  = useState(false);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.password !== form.confirm) {
      return setError('Passwords do not match.');
    }
    if (form.password.length < 8) {
      return setError('Password must be at least 8 characters.');
    }
    setLoading(true);
    try {
      const { data } = await api.post('/auth/users', {
        name:     form.name.trim(),
        email:    form.email.trim(),
        password: form.password,
      });
      onCreated(data.user);
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create user.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal show d-block" tabIndex="-1" style={{ background: 'rgba(0,0,0,.4)' }}>
      <div className="modal-dialog">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">Add New Admin User</h5>
            <button className="btn-close" onClick={onClose} />
          </div>
          <form onSubmit={handleSubmit}>
            <div className="modal-body">
              {error && <div className="alert alert-danger py-2 small">{error}</div>}

              <div className="mb-3">
                <label className="form-label small fw-semibold">Full Name</label>
                <input
                  className="form-control"
                  placeholder="e.g. Sneha"
                  value={form.name}
                  onChange={set('name')}
                  required
                />
              </div>

              <div className="mb-3">
                <label className="form-label small fw-semibold">Email</label>
                <input
                  type="email"
                  className="form-control"
                  placeholder="user@example.com"
                  value={form.email}
                  onChange={set('email')}
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
                    value={form.password}
                    onChange={set('password')}
                    required
                    minLength={8}
                  />
                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    onClick={() => setShowPw((v) => !v)}
                  >
                    {showPw ? '🙈' : '👁'}
                  </button>
                </div>
                <div className="form-text">
                  Stored as a secure bcrypt hash in MongoDB — never in plain text.
                </div>
              </div>

              <div className="mb-3">
                <label className="form-label small fw-semibold">Confirm Password</label>
                <input
                  type={showPw ? 'text' : 'password'}
                  className="form-control"
                  placeholder="Repeat password"
                  value={form.confirm}
                  onChange={set('confirm')}
                  required
                />
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-outline-secondary" onClick={onClose}>
                Cancel
              </button>
              <button className="btn btn-primary" disabled={loading}>
                {loading ? (
                  <><span className="spinner-border spinner-border-sm me-1" />Creating…</>
                ) : 'Create User'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Change Password Modal
// ---------------------------------------------------------------------------
function ChangePasswordModal({ target, onClose }) {
  const [pw,      setPw]      = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPw,  setShowPw]  = useState(false);
  const [error,   setError]   = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setSuccess('');
    if (pw !== confirm) return setError('Passwords do not match.');
    if (pw.length < 8)  return setError('Password must be at least 8 characters.');
    setLoading(true);
    try {
      await api.patch(`/auth/users/${target._id}/password`, { password: pw });
      setSuccess(`Password updated for ${target.email}.`);
      setPw(''); setConfirm('');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal show d-block" tabIndex="-1" style={{ background: 'rgba(0,0,0,.4)' }}>
      <div className="modal-dialog">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">Change Password — {target.name}</h5>
            <button className="btn-close" onClick={onClose} />
          </div>
          <form onSubmit={handleSubmit}>
            <div className="modal-body">
              <div className="text-muted small mb-3">{target.email}</div>
              {error   && <div className="alert alert-danger py-2 small">{error}</div>}
              {success && <div className="alert alert-success py-2 small">{success}</div>}

              <div className="mb-3">
                <label className="form-label small fw-semibold">New Password</label>
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
                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    onClick={() => setShowPw((v) => !v)}
                  >
                    {showPw ? '🙈' : '👁'}
                  </button>
                </div>
              </div>
              <div className="mb-3">
                <label className="form-label small fw-semibold">Confirm New Password</label>
                <input
                  type={showPw ? 'text' : 'password'}
                  className="form-control"
                  placeholder="Repeat new password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  required
                />
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-outline-secondary" onClick={onClose}>
                Close
              </button>
              <button className="btn btn-warning" disabled={loading}>
                {loading ? <><span className="spinner-border spinner-border-sm me-1" />Updating…</> : 'Update Password'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Users page
// ---------------------------------------------------------------------------
export default function Users() {
  const { user: currentUser } = useAuth();
  const [users,     setUsers]     = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [showAdd,   setShowAdd]   = useState(false);
  const [changePwTarget, setChangePwTarget] = useState(null);
  const [deleteConfirm,  setDeleteConfirm]  = useState(null);
  const [deleteLoading,  setDeleteLoading]  = useState(false);
  const [toast,     setToast]     = useState('');

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/auth/users');
      setUsers(data.users || []);
    } catch (e) {
      console.error('Failed to fetch users:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3500);
  };

  const handleDelete = async (user) => {
    setDeleteLoading(true);
    try {
      await api.delete(`/auth/users/${user._id}`);
      setUsers((prev) => prev.filter((u) => u._id !== user._id));
      showToast(`${user.email} deleted.`);
      setDeleteConfirm(null);
    } catch (e) {
      showToast(`Error: ${e.response?.data?.error || e.message}`);
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="p-4">
      {/* Toast */}
      {toast && (
        <div
          className="position-fixed top-0 end-0 m-3 alert alert-dark py-2 px-3 small shadow"
          style={{ zIndex: 9999, minWidth: 260 }}
        >
          {toast}
        </div>
      )}

      <div className="d-flex align-items-center justify-content-between mb-4">
        <div>
          <h4 className="mb-0 fw-semibold">👤 User Accounts</h4>
          <p className="text-muted small mb-0">
            Manage admin accounts. Passwords are stored as secure bcrypt hashes in MongoDB only.
          </p>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => setShowAdd(true)}>
          + Add User
        </button>
      </div>

      {/* Security note */}
      <div className="alert alert-info py-2 small mb-4 d-flex align-items-start gap-2">
        <span>🔒</span>
        <div>
          Passwords are <strong>never stored as plain text</strong>. They are hashed using bcrypt
          (12 rounds) and saved only in MongoDB. They do not appear in logs, environment variables,
          or anywhere else. Only the hash is stored — it cannot be reversed.
        </div>
      </div>

      {loading ? (
        <div className="text-center py-5 text-muted">
          <div className="spinner-border mb-2" />
          <div>Loading users…</div>
        </div>
      ) : (
        <div className="card border-0 shadow-sm">
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Last Login</th>
                  <th>Created</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {users.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-center text-muted py-4">No users found.</td>
                  </tr>
                )}
                {users.map((u) => (
                  <tr key={u._id}>
                    <td className="fw-semibold small">
                      {u.name}
                      {u._id === currentUser?._id || u.email === currentUser?.email ? (
                        <span className="badge bg-primary bg-opacity-10 text-primary ms-2" style={{ fontSize: 10 }}>
                          You
                        </span>
                      ) : null}
                    </td>
                    <td className="small font-monospace">{u.email}</td>
                    <td>
                      <span className="badge bg-secondary bg-opacity-10 text-secondary border border-secondary border-opacity-25">
                        {u.role}
                      </span>
                    </td>
                    <td className="small text-muted">{fmt(u.lastLoginAt)}</td>
                    <td className="small text-muted">{fmt(u.createdAt)}</td>
                    <td>
                      <div className="d-flex gap-2 justify-content-end">
                        <button
                          className="btn btn-outline-warning btn-sm"
                          onClick={() => setChangePwTarget(u)}
                        >
                          Change Password
                        </button>
                        {u.email !== currentUser?.email && (
                          <button
                            className="btn btn-outline-danger btn-sm"
                            onClick={() => setDeleteConfirm(u)}
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {deleteConfirm && (
        <div className="modal show d-block" tabIndex="-1" style={{ background: 'rgba(0,0,0,.4)' }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title text-danger">Delete User</h5>
                <button className="btn-close" onClick={() => setDeleteConfirm(null)} />
              </div>
              <div className="modal-body">
                Are you sure you want to delete <strong>{deleteConfirm.email}</strong>?
                This cannot be undone. They will be immediately logged out.
              </div>
              <div className="modal-footer">
                <button className="btn btn-outline-secondary" onClick={() => setDeleteConfirm(null)}>
                  Cancel
                </button>
                <button
                  className="btn btn-danger"
                  onClick={() => handleDelete(deleteConfirm)}
                  disabled={deleteLoading}
                >
                  {deleteLoading ? <><span className="spinner-border spinner-border-sm me-1" />Deleting…</> : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add user modal */}
      {showAdd && (
        <AddUserModal
          onClose={() => setShowAdd(false)}
          onCreated={(newUser) => {
            setUsers((prev) => [newUser, ...prev]);
            showToast(`User ${newUser.email} created.`);
          }}
        />
      )}

      {/* Change password modal */}
      {changePwTarget && (
        <ChangePasswordModal
          target={changePwTarget}
          onClose={() => setChangePwTarget(null)}
        />
      )}
    </div>
  );
}
