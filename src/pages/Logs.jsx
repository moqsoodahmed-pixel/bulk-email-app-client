import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';

const COMPANIES = [
  { key: 'launcherdesk',  label: 'Launcherdesk',  color: 'primary' },
  { key: 'officerestore', label: 'Officerestore', color: 'success' },
];

const EVENT_META = {
  delivered:    { label: 'Delivered',    color: 'success'   },
  opened:       { label: 'Opened',       color: 'info'      },
  uniqueOpened: { label: 'First open',   color: 'info'      },
  clicks:       { label: 'Clicked',      color: 'primary'   },
  requests:     { label: 'Sent',         color: 'secondary' },
  softBounces:  { label: 'Soft bounce',  color: 'warning'   },
  hardBounces:  { label: 'Hard bounce',  color: 'danger'    },
  spam:         { label: 'Spam report',  color: 'danger'    },
  unsubscribed: { label: 'Unsubscribed', color: 'dark'      },
  blocked:      { label: 'Blocked',      color: 'danger'    },
  invalid:      { label: 'Invalid',      color: 'danger'    },
  deferred:     { label: 'Deferred',     color: 'warning'   },
  error:        { label: 'Error',        color: 'danger'    },
};

function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true,
  });
}

function StatCard({ label, value, sub, color = 'secondary' }) {
  return (
    <div className="col">
      <div className="card border-0 shadow-sm h-100">
        <div className="card-body py-3">
          <div className="text-muted" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '.05em' }}>
            {label}
          </div>
          <div className={`fw-semibold text-${color}`} style={{ fontSize: 24, lineHeight: 1.3 }}>
            {value}
          </div>
          {sub && <div className="text-muted" style={{ fontSize: 11 }}>{sub}</div>}
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
      const q = `/stats/events?company=${company}&days=${days}&limit=100${evFilter ? `&event=${evFilter}` : ''}`;
      const { data } = await api.get(q);
      setEvents(data.events || []);
    } catch {
      setEvents([]);
    } finally { setEvLoading(false); }
  }, [company, days, evFilter]);

  useEffect(() => { fetchStats(); },  [fetchStats]);
  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  const t = stats?.totals || {};
  const r = stats?.rates  || {};

  return (
    <div className="p-4">
      <div className="d-flex align-items-center justify-content-between mb-3 flex-wrap gap-2">
        <div>
          <h4 className="mb-0 fw-semibold">📊 Email Logs & Analytics</h4>
          <p className="text-muted small mb-0">
            Live delivery, open and click data pulled directly from Brevo.
          </p>
        </div>
        <button className="btn btn-outline-secondary btn-sm" onClick={() => { fetchStats(); fetchEvents(); }}>
          ↻ Refresh
        </button>
      </div>

      <div className="row g-2 mb-4">
        <div className="col-auto">
          <div className="btn-group">
            {COMPANIES.map((c) => (
              <button
                key={c.key}
                className={`btn btn-sm ${company === c.key ? `btn-${c.color}` : 'btn-outline-secondary'}`}
                onClick={() => setCompany(c.key)}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>
        <div className="col-auto">
          <select className="form-select form-select-sm" value={days}
            onChange={(e) => setDays(Number(e.target.value))}>
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
          </select>
        </div>
      </div>

      {error && <div className="alert alert-warning py-2 small">{error}</div>}

      {loading ? (
        <div className="text-center py-5 text-muted">
          <div className="spinner-border mb-2" />
          <div>Loading stats from Brevo…</div>
        </div>
      ) : stats ? (
        <>
          <div className="row row-cols-2 row-cols-md-4 g-3 mb-3">
            <StatCard label="Sent"      value={t.requests     ?? 0} color="dark" />
            <StatCard label="Delivered" value={t.delivered    ?? 0} sub={`${r.deliveryRate}% delivery rate`} color="success" />
            <StatCard label="Opened"    value={t.uniqueOpens  ?? 0} sub={`${r.openRate}% open rate`}         color="info" />
            <StatCard label="Clicked"   value={t.uniqueClicks ?? 0} sub={`${r.clickRate}% click rate`}       color="primary" />
          </div>

          <div className="row row-cols-2 row-cols-md-4 g-3 mb-4">
            <StatCard label="Hard bounces" value={t.hardBounces  ?? 0} color="danger" />
            <StatCard label="Soft bounces" value={t.softBounces  ?? 0} color="warning" />
            <StatCard label="Spam reports" value={t.spamReports  ?? 0} color="danger" />
            <StatCard label="Unsubscribed" value={t.unsubscribed ?? 0} sub={`${r.unsubRate}%`} color="secondary" />
          </div>

          <div className="card border-0 shadow-sm mb-4">
            <div className="card-header bg-white border-bottom py-2">
              <span className="small fw-semibold">Per Brevo account</span>
              <span className="text-muted small ms-2">{stats.accounts} account(s) configured</span>
            </div>
            <div className="table-responsive">
              <table className="table table-sm mb-0 align-middle">
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
                          <td className="text-end small">{a.requests}</td>
                          <td className="text-end small text-success">{a.delivered}</td>
                          <td className="text-end small text-info">{a.uniqueOpens}</td>
                          <td className="text-end small text-primary">{a.uniqueClicks}</td>
                          <td className="text-end small text-danger">{(a.hardBounces || 0) + (a.softBounces || 0)}</td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="card border-0 shadow-sm">
            <div className="card-header bg-white border-bottom py-2 d-flex align-items-center justify-content-between flex-wrap gap-2">
              <span className="small fw-semibold">Recent activity</span>
              <select className="form-select form-select-sm" style={{ width: 170 }}
                value={evFilter} onChange={(e) => setEvFilter(e.target.value)}>
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
                <span className="spinner-border spinner-border-sm me-2" />Loading events…
              </div>
            ) : events.length === 0 ? (
              <div className="text-center py-4 text-muted small">
                No events found in this period. Brevo keeps event data for about 30 days.
              </div>
            ) : (
              <div className="table-responsive" style={{ maxHeight: 480 }}>
                <table className="table table-sm table-hover mb-0 align-middle">
                  <thead className="table-light" style={{ position: 'sticky', top: 0, zIndex: 1 }}>
                    <tr>
                      <th>When</th>
                      <th>Recipient</th>
                      <th>Event</th>
                      <th>Subject</th>
                      <th>Acc</th>
                    </tr>
                  </thead>
                  <tbody>
                    {events.map((e, i) => {
                      const m = EVENT_META[e.event] || { label: e.event, color: 'secondary' };
                      return (
                        <tr key={i}>
                          <td className="small text-muted" style={{ whiteSpace: 'nowrap' }}>{fmtDate(e.date)}</td>
                          <td className="small font-monospace">{e.email}</td>
                          <td><span className={`badge bg-${m.color}`}>{m.label}</span></td>
                          <td className="small text-truncate" style={{ maxWidth: 260 }}>{e.subject || '—'}</td>
                          <td className="small text-muted">{e.account}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="card border-0 shadow-sm">
          <div className="card-body text-center py-5 text-muted">
            <div style={{ fontSize: 40 }}>📭</div>
            <div className="mt-2">No stats available. Check that your Brevo API keys are configured.</div>
          </div>
        </div>
      )}
    </div>
  );
}
