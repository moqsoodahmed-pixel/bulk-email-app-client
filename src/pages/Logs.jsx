import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const COMPANY_META = {
  launcherdesk:  { color: 'primary', label: 'Launcherdesk'  },
  officerestore: { color: 'success', label: 'Officerestore' },
};

const STATUS_META = {
  running:   { color: 'warning',   label: 'Running…'  },
  completed: { color: 'success',   label: 'Completed' },
  stopped:   { color: 'dark',      label: 'Stopped'   },
  failed:    { color: 'danger',    label: 'Failed'    },
};

function fmt(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true,
  });
}

function duration(start, end) {
  if (!start || !end) return '—';
  const secs = Math.round((new Date(end) - new Date(start)) / 1000);
  if (secs < 60) return `${secs}s`;
  const mins = Math.floor(secs / 60);
  const rem  = secs % 60;
  return `${mins}m ${rem}s`;
}

// ---------------------------------------------------------------------------
// ResendModal — shows failed recipients and lets user resend or dismiss
// ---------------------------------------------------------------------------
function ResendModal({ log, onClose, onDone }) {
  const [loading,  setLoading]  = useState(false);
  const [clearing, setClearing] = useState(false);
  const [message,  setMessage]  = useState('');

  const pending = (log.failedRecipients || []).filter((r) => r.retryStatus === 'pending');
  const retried = (log.failedRecipients || []).filter((r) => r.retryStatus !== 'pending');

  const handleResend = async () => {
    setLoading(true);
    setMessage('');
    try {
      const { data } = await api.post(`/logs/${log._id}/resend`);
      setMessage(`✅ ${data.message} Refresh the log in a moment to see updated statuses.`);
      onDone();
    } catch (e) {
      setMessage(`❌ ${e.response?.data?.error || e.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleClear = async () => {
    setClearing(true);
    try {
      await api.delete(`/logs/${log._id}/failed`);
      onDone();
      onClose();
    } catch (e) {
      setMessage(`❌ ${e.response?.data?.error || e.message}`);
    } finally {
      setClearing(false);
    }
  };

  return (
    <div className="modal show d-block" tabIndex="-1" style={{ background: 'rgba(0,0,0,.4)' }}>
      <div className="modal-dialog modal-lg modal-dialog-scrollable">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">
              Failed Recipients — {log.campaignName}
            </h5>
            <button className="btn-close" onClick={onClose} />
          </div>
          <div className="modal-body p-0">
            {message && (
              <div className={`alert m-3 mb-0 py-2 ${message.startsWith('✅') ? 'alert-success' : 'alert-danger'}`}>
                {message}
              </div>
            )}

            {pending.length === 0 && (
              <div className="text-center text-muted py-5">
                No pending failures — all have been retried or cleared.
              </div>
            )}

            {pending.length > 0 && (
              <>
                <div className="px-3 py-2 border-bottom bg-light">
                  <small className="text-muted fw-semibold">
                    {pending.length} pending — these will be resent
                  </small>
                </div>
                <table className="table table-sm table-hover mb-0">
                  <thead className="table-light">
                    <tr>
                      <th>Email</th>
                      <th>Name</th>
                      <th>Reason</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pending.map((r, i) => (
                      <tr key={i}>
                        <td className="font-monospace small">{r.email}</td>
                        <td className="small">{r.name || '—'}</td>
                        <td className="small text-danger" style={{ maxWidth: 220, wordBreak: 'break-word' }}>
                          {r.reason}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}

            {retried.length > 0 && (
              <>
                <div className="px-3 py-2 border-top border-bottom bg-light">
                  <small className="text-muted fw-semibold">Previously retried</small>
                </div>
                <table className="table table-sm mb-0">
                  <tbody>
                    {retried.map((r, i) => (
                      <tr key={i}>
                        <td className="font-monospace small">{r.email}</td>
                        <td>
                          <span className={`badge bg-${r.retryStatus === 'success' ? 'success' : 'danger'}`}>
                            {r.retryStatus}
                          </span>
                        </td>
                        <td className="small text-muted">{fmt(r.retriedAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}
          </div>
          <div className="modal-footer gap-2">
            <button className="btn btn-outline-secondary btn-sm" onClick={handleClear} disabled={clearing}>
              {clearing ? 'Clearing…' : 'Dismiss all'}
            </button>
            {pending.length > 0 && (
              <button className="btn btn-danger btn-sm" onClick={handleResend} disabled={loading}>
                {loading ? (
                  <><span className="spinner-border spinner-border-sm me-1" />Resending…</>
                ) : (
                  `Resend ${pending.length} failed email${pending.length > 1 ? 's' : ''}`
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Logs page
// ---------------------------------------------------------------------------
export default function Logs() {
  const [logs,       setLogs]       = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [page,       setPage]       = useState(1);
  const [pagination, setPagination] = useState({});
  const [selected,   setSelected]   = useState(null); // log open in modal

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/logs?page=${page}`);
      setLogs(data.logs || []);
      setPagination(data.pagination || {});
    } catch (e) {
      console.error('Failed to fetch logs:', e);
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  // Auto-refresh while any log is still running
  useEffect(() => {
    const hasRunning = logs.some((l) => l.blastStatus === 'running');
    if (!hasRunning) return;
    const id = setInterval(fetchLogs, 8000);
    return () => clearInterval(id);
  }, [logs, fetchLogs]);

  const openModal = async (log) => {
    // Fetch fresh copy to get latest failedRecipients
    try {
      const { data } = await api.get(`/logs/${log._id}`);
      setSelected(data.log);
    } catch {
      setSelected(log);
    }
  };

  return (
    <div className="p-4">
      <div className="d-flex align-items-center justify-content-between mb-4">
        <div>
          <h4 className="mb-0 fw-semibold">📋 Blast Logs</h4>
          <p className="text-muted small mb-0">
            Every email blast — who triggered it, results, and failed recipients for resend.
          </p>
        </div>
        <button className="btn btn-outline-secondary btn-sm" onClick={fetchLogs} disabled={loading}>
          {loading ? <span className="spinner-border spinner-border-sm" /> : '↻ Refresh'}
        </button>
      </div>

      {loading && logs.length === 0 ? (
        <div className="text-center py-5 text-muted">
          <div className="spinner-border mb-3" />
          <div>Loading logs…</div>
        </div>
      ) : logs.length === 0 ? (
        <div className="card border-0 shadow-sm">
          <div className="card-body text-center py-5 text-muted">
            <div style={{ fontSize: 40 }}>📭</div>
            <div className="mt-2">No blast logs yet. Send your first campaign to see logs here.</div>
          </div>
        </div>
      ) : (
        <>
          <div className="card border-0 shadow-sm">
            <div className="table-responsive">
              <table className="table table-hover mb-0 align-middle">
                <thead className="table-light">
                  <tr>
                    <th style={{ width: 180 }}>Triggered</th>
                    <th>Campaign</th>
                    <th>By</th>
                    <th>Company</th>
                    <th className="text-end">Targeted</th>
                    <th className="text-end">Sent</th>
                    <th className="text-end">Failed</th>
                    <th>Duration</th>
                    <th>Status</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => {
                    const sm     = STATUS_META[log.blastStatus]  || { color: 'secondary', label: log.blastStatus };
                    const cm     = COMPANY_META[log.company]     || { color: 'secondary', label: log.company };
                    const fails  = (log.failedRecipients || []).filter((r) => r.retryStatus === 'pending').length;

                    return (
                      <tr key={log._id}>
                        <td className="small text-muted">{fmt(log.startedAt)}</td>
                        <td>
                          <div className="fw-semibold small">{log.campaignName}</div>
                          <div className="text-muted" style={{ fontSize: 11 }}>{log.subject}</div>
                        </td>
                        <td className="small">{log.triggeredBy?.userEmail || '—'}</td>
                        <td>
                          <span className={`badge bg-${cm.color} bg-opacity-10 text-${cm.color} border border-${cm.color} border-opacity-25`}>
                            {cm.label}
                          </span>
                        </td>
                        <td className="text-end small">{log.totalTargeted ?? '—'}</td>
                        <td className="text-end">
                          <span className="text-success fw-semibold small">{log.totalSent ?? '—'}</span>
                        </td>
                        <td className="text-end">
                          {log.totalFailed > 0 ? (
                            <span className="text-danger fw-semibold small">{log.totalFailed}</span>
                          ) : (
                            <span className="text-muted small">{log.totalFailed ?? '—'}</span>
                          )}
                        </td>
                        <td className="small text-muted">{duration(log.startedAt, log.completedAt)}</td>
                        <td>
                          <span className={`badge bg-${sm.color}`}>{sm.label}</span>
                        </td>
                        <td>
                          {fails > 0 && (
                            <button
                              className="btn btn-danger btn-sm"
                              onClick={() => openModal(log)}
                              title={`${fails} failed — click to resend`}
                            >
                              {fails} failed
                            </button>
                          )}
                          {fails === 0 && log.blastStatus !== 'running' && log.totalFailed > 0 && (
                            <span className="badge bg-success bg-opacity-10 text-success border border-success border-opacity-25">
                              All resent ✓
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className="d-flex justify-content-center gap-2 mt-3">
              <button
                className="btn btn-outline-secondary btn-sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                ← Prev
              </button>
              <span className="btn btn-sm disabled text-muted">
                Page {page} of {pagination.pages}
              </span>
              <button
                className="btn btn-outline-secondary btn-sm"
                disabled={page >= pagination.pages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next →
              </button>
            </div>
          )}
        </>
      )}

      {/* Resend modal */}
      {selected && (
        <ResendModal
          log={selected}
          onClose={() => setSelected(null)}
          onDone={() => { fetchLogs(); setSelected(null); }}
        />
      )}
    </div>
  );
}
