import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';

const COMPANIES = [
  { key: 'launcherdesk',  label: 'Launcherdesk',  color: 'primary' },
  { key: 'officerestore', label: 'Officerestore', color: 'success' },
];

const EVENT_LABELS = {
  delivered:    { label: 'Delivered',    color: 'success'   },
  opened:       { label: 'Opened',       color: 'info'      },
  uniqueOpened: { label: 'First open',   color: 'info'      },
  clicks:       { label: 'Clicked',      color: 'primary'   },
  requests:     { label: 'Sent',         color: 'secondary' },
  softBounces:  { label: 'Soft bounce',  color: 'warning'   },
  hardBounces:  { label: 'Hard bounce',  color: 'danger'    },
  spam:         { label: 'Spam',         color: 'danger'    },
  unsubscribed: { label: 'Unsubscribed', color: 'dark'      },
  blocked:      { label: 'Blocked',      color: 'danger'    },
};

const DAY_OPTIONS = [
  { value: 1,   label: 'Today'       },
  { value: 7,   label: 'Last 7 days' },
  { value: 30,  label: 'Last 30 days'},
  { value: 90,  label: 'Last 90 days'},
  { value: 365, label: 'All time'    },
];

function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true,
  });
}

function StatCard({ label, value, sub, color = 'secondary' }) {
  return (
    <div className="col">
      <div className="card border-0 shadow-sm h-100">
        <div className="card-body py-3 px-3">
          <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '.06em', color: '#888', marginBottom: 4 }}>
            {label}
          </div>
          <div className={`fw-bold text-${color}`} style={{ fontSize: 22, lineHeight: 1.2 }}>
            {(value ?? 0).toLocaleString()}
          </div>
          {sub && <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>{sub}</div>}
        </div>
      </div>
    </div>
  );
}

export default function Logs() {
  const [company,   setCompany]   = useState('launcherdesk');
  const [days,      setDays]      = useState(30);
  const [stats,     setStats]     = useState(null);
  const [events,    setEvents]    = useState([]);
  const [evFilter,  setEvFilter]  = useState('');
  const [loading,   setLoading]   = useState(true);
  const [evLoading, setEvLoading] = useState(false);
  const [error,     setError]     = useState('');
  const [exporting, setExporting] = useState('');

  const fetchStats = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const { data } = await api.get(`/stats?company=${company}&days=${days}`);
      setStats(data);
    } catch (e) {
      setError(e.response?.data?.error || 'Could not load stats from Brevo.');
      setStats(null);
    } finally { setLoading(false); }
  }, [company, days]);

  const fetchEvents = useCallback(async () => {
    setEvLoading(true);
    try {
      const q = `/stats/events?company=${company}&days=${days}&limit=200${evFilter ? `&event=${evFilter}` : ''}`;
      const { data } = await api.get(q);
      setEvents(data.events || []);
    } catch { setEvents([]); }
    finally { setEvLoading(false); }
  }, [company, days, evFilter]);

  useEffect(() => { fetchStats(); },  [fetchStats]);
  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  const downloadCSV = async () => {
    setExporting('analytics');
    try {
      const url = `https://bulk-email-app-server.onrender.com/api/export/analytics?company=${company}&days=${days}`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${localStorage.getItem('bea_token')}` },
      });
      if (!res.ok) { alert('No data to export.'); return; }
      const blob = await res.blob();
      const fn   = res.headers.get('Content-Disposition')?.split('filename="')[1]?.replace('"', '') || 'analytics.csv';
      const a    = document.createElement('a');
      a.href     = URL.createObjectURL(blob);
      a.download = fn;
      a.click();
    } catch (e) { alert('Export failed: ' + e.message); }
    finally { setExporting(''); }
  };

  const selectedLabel = DAY_OPTIONS.find((o) => o.value === days)?.label || '';
  const t = stats?.totals || {};
  const r = stats?.rates  || {};

  return (
    <div className="p-3 p-md-4">

      {/* ── Header ── */}
      <div className="d-flex flex-column flex-sm-row align-items-start align-items-sm-center
                      justify-content-between gap-2 mb-3">
        <div>
          <h4 className="mb-0 fw-semibold" style={{ fontSize: 'clamp(1rem,4vw,1.4rem)' }}>
            📊 Email Logs &amp; Analytics
          </h4>
          <p className="text-muted mb-0" style={{ fontSize: 12 }}>
            Real data pulled live from Brevo's API — delivered, opened, clicked, bounced per recipient.
          </p>
        </div>
        <div className="d-flex gap-2 flex-shrink-0">
          <button
            className="btn btn-outline-success btn-sm"
            onClick={downloadCSV}
            disabled={exporting === 'analytics'}
            style={{ whiteSpace: 'nowrap' }}
          >
            {exporting === 'analytics'
              ? <><span className="spinner-border spinner-border-sm me-1" />Exporting…</>
              : '⬇ Export (.csv)'}
          </button>
          <button
            className="btn btn-outline-secondary btn-sm"
            onClick={() => { fetchStats(); fetchEvents(); }}
            style={{ whiteSpace: 'nowrap' }}
          >
            ↻ Refresh
          </button>
        </div>
      </div>

      {/* ── Filters ── */}
      <div className="d-flex flex-wrap align-items-center gap-2 mb-4">
        {/* Company toggle */}
        <div className="btn-group btn-group-sm">
          {COMPANIES.map((c) => (
            <button
              key={c.key}
              className={`btn ${company === c.key ? `btn-${c.color}` : 'btn-outline-secondary'}`}
              onClick={() => setCompany(c.key)}
            >
              {c.label}
            </button>
          ))}
        </div>

        {/* Period — pill buttons on desktop, select on mobile */}
        <div className="d-none d-md-flex btn-group btn-group-sm">
          {DAY_OPTIONS.map((o) => (
            <button
              key={o.value}
              className={`btn ${days === o.value ? 'btn-dark' : 'btn-outline-secondary'}`}
              onClick={() => setDays(o.value)}
            >
              {o.label}
            </button>
          ))}
        </div>
        {/* Mobile dropdown */}
        <div className="d-md-none">
          <select
            className="form-select form-select-sm"
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            style={{ minWidth: 140 }}
          >
            {DAY_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
      </div>

      {error && (
        <div className="alert alert-warning py-2 small mb-3">
          {error} — Check that Brevo API keys are configured in Render environment variables.
        </div>
      )}

      {loading ? (
        <div className="text-center py-5 text-muted">
          <div className="spinner-border mb-2" />
          <div>Loading data from Brevo — {selectedLabel}…</div>
        </div>
      ) : stats ? (
        <>
          {/* ── Stat cards row 1 ── */}
          <div className="row row-cols-2 row-cols-md-4 g-2 g-md-3 mb-2 mb-md-3">
            <StatCard label="Sent"      value={t.requests    } color="dark"    />
            <StatCard label="Delivered" value={t.delivered   } color="success"
              sub={`${r.deliveryRate}% delivery rate`} />
            <StatCard label="Opened"    value={t.uniqueOpens } color="info"
              sub={`${r.openRate}% open rate`} />
            <StatCard label="Clicked"   value={t.uniqueClicks} color="primary"
              sub={`${r.clickRate}% click rate`} />
          </div>

          {/* ── Stat cards row 2 ── */}
          <div className="row row-cols-2 row-cols-md-4 g-2 g-md-3 mb-3 mb-md-4">
            <StatCard label="Hard bounces" value={t.hardBounces } color="danger"    />
            <StatCard label="Soft bounces" value={t.softBounces } color="warning"   />
            <StatCard label="Spam reports" value={t.spamReports } color="danger"    />
            <StatCard label="Unsubscribed" value={t.unsubscribed} color="secondary"
              sub={`${r.unsubRate}%`} />
          </div>

          {/* ── Period badge ── */}
          <div className="d-flex align-items-center gap-2 mb-3">
            <span className="badge bg-dark">{selectedLabel}</span>
            <span className="text-muted small">
              {stats.range?.startDate} → {stats.range?.endDate}
            </span>
          </div>

          {/* ── Info banner ── */}
          <div className="alert alert-info py-2 small mb-3 d-flex gap-2 align-items-start">
            <span style={{ flexShrink: 0 }}>ℹ️</span>
            <div>
              <strong>This is real data from Brevo's API</strong> — not estimated or mocked.
              Brevo tracks every email event (delivered, opened, clicked, bounced) for 30 days.
              "Loaded by proxy" means Gmail's image proxy loaded the tracking pixel — the email was{' '}
              <strong>delivered and opened</strong>.
              {days === 365 && (
                <span className="ms-1 text-warning">
                  Note: Brevo free plans retain per-recipient event data for ~30 days only.
                  Aggregate totals (the cards above) cover the full period.
                </span>
              )}
            </div>
          </div>

          {/* ── Per account table ── */}
          <div className="card border-0 shadow-sm mb-3 mb-md-4">
            <div className="card-header bg-white py-2 d-flex align-items-center gap-2 flex-wrap">
              <span className="small fw-semibold">Per Brevo account</span>
              <span className="badge bg-secondary bg-opacity-10 text-secondary" style={{ fontSize: 11 }}>
                {stats.accounts} account(s) configured
              </span>
            </div>
            <div className="table-responsive">
              <table className="table table-sm mb-0 align-middle" style={{ minWidth: 380 }}>
                <thead className="table-light">
                  <tr>
                    <th>Account</th>
                    <th className="text-end">Sent</th>
                    <th className="text-end">Delivered</th>
                    <th className="text-end">Opened</th>
                    <th className="text-end">Clicked</th>
                    <th className="text-end">Bounced</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.perAccount.map((a) => (
                    <tr key={a.account}>
                      <td className="small fw-semibold">Account {a.account}</td>
                      {a.error ? (
                        <td colSpan={5} className="small text-danger">{a.error}</td>
                      ) : (
                        <>
                          <td className="text-end small">{a.requests ?? 0}</td>
                          <td className="text-end small text-success">{a.delivered ?? 0}</td>
                          <td className="text-end small text-info">{a.uniqueOpens ?? 0}</td>
                          <td className="text-end small text-primary">{a.uniqueClicks ?? 0}</td>
                          <td className="text-end small text-danger">
                            {(a.hardBounces || 0) + (a.softBounces || 0)}
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* ── Per-recipient activity ── */}
          <div className="card border-0 shadow-sm">
            <div className="card-header bg-white py-2 d-flex align-items-center
                            justify-content-between flex-wrap gap-2">
              <span className="small fw-semibold">
                Per-recipient activity
                <span className="text-muted fw-normal ms-1">— who opened, clicked, bounced</span>
              </span>
              <select
                className="form-select form-select-sm"
                style={{ width: 'min(170px, 100%)' }}
                value={evFilter}
                onChange={(e) => setEvFilter(e.target.value)}
              >
                <option value="">All events</option>
                <option value="delivered">Delivered</option>
                <option value="opened">Opened</option>
                <option value="clicks">Clicked</option>
                <option value="hardBounces">Hard bounces</option>
                <option value="softBounces">Soft bounces</option>
                <option value="spam">Spam reports</option>
                <option value="unsubscribed">Unsubscribed</option>
              </select>
            </div>

            {evLoading ? (
              <div className="text-center py-4 text-muted small">
                <span className="spinner-border spinner-border-sm me-2" />
                Loading per-recipient data…
              </div>
            ) : events.length === 0 ? (
              <div className="text-center py-4 text-muted small px-3">
                No events in this period. Brevo keeps per-recipient data for ~30 days.
                Try selecting "Last 90 days".
              </div>
            ) : (
              <>
                <div className="px-3 py-2 bg-light border-bottom" style={{ fontSize: 11, color: '#666' }}>
                  Showing {events.length} events — export to CSV for full dataset
                </div>
                {/* Scrollable on all screen sizes */}
                <div className="table-responsive" style={{ maxHeight: 460 }}>
                  <table className="table table-sm table-hover mb-0 align-middle" style={{ minWidth: 560 }}>
                    <thead className="table-light" style={{ position: 'sticky', top: 0, zIndex: 1 }}>
                      <tr>
                        <th style={{ minWidth: 130 }}>When</th>
                        <th style={{ minWidth: 160 }}>Recipient</th>
                        <th style={{ minWidth: 90 }}>Event</th>
                        <th style={{ minWidth: 140 }}>Subject</th>
                        <th style={{ minWidth: 60 }}>Acc</th>
                        <th style={{ minWidth: 80 }}>Reason</th>
                      </tr>
                    </thead>
                    <tbody>
                      {events.map((e, i) => {
                        const m = EVENT_LABELS[e.event] || { label: e.event, color: 'secondary' };
                        return (
                          <tr key={i}>
                            <td className="small text-muted" style={{ whiteSpace: 'nowrap' }}>
                              {fmtDate(e.date)}
                            </td>
                            <td className="small font-monospace text-truncate" style={{ maxWidth: 180 }}>
                              {e.email}
                            </td>
                            <td>
                              <span className={`badge bg-${m.color}`} style={{ fontSize: 10 }}>
                                {m.label}
                              </span>
                            </td>
                            <td className="small text-truncate" style={{ maxWidth: 160 }}>
                              {e.subject || '—'}
                            </td>
                            <td className="small text-muted">{e.account}</td>
                            <td className="small text-danger">{e.reason || ''}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </>
      ) : (
        <div className="card border-0 shadow-sm">
          <div className="card-body text-center py-5 text-muted">
            <div style={{ fontSize: 40 }}>📭</div>
            <div className="mt-2">No stats available. Check Brevo API keys in Render environment.</div>
          </div>
        </div>
      )}
    </div>
  );
}