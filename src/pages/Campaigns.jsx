import { useState, useEffect, useCallback, useRef } from 'react';
import api from '../services/api';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const COMPANY_META = {
  launcherdesk:  { color: 'primary',  emoji: 'LD', label: 'Launcherdesk'  },
  officerestore: { color: 'success',  emoji: 'OR', label: 'Officerestore' },
};

const STATUS_META = {
  draft:   { color: 'secondary', label: 'Draft'     },
  sending: { color: 'warning',   label: 'Sending…'  },
  sent:    { color: 'success',   label: 'Sent'       },
  failed:  { color: 'danger',    label: 'Failed'     },
  stopped: { color: 'dark',      label: 'Stopped'    },
};

const LAUNCHERDESK_TEMPLATE = `Hi {{name}},

Congratulations on your new venture!

If you're currently setting up {{company}}, there's a smart way to get your website, software and compliance sorted — without coordinating with multiple vendors.

Launcherdesk provides complete digital and business solutions at one place — ideal for startups and growing businesses building their presence from scratch.

We offer:
- Website & E-commerce Development
- Business Software, CRM & Automation
- Digital Marketing & Lead Generation
- WhatsApp Business API & Customer Communication
- Business Registration & Compliance Support
- Branding, Logo & Creative Design
- Office & Commercial Furniture Solutions

🌐 Explore our services: Launcherdesk.com

You can explore our solutions, compare options and choose what fits your business stage and budget.

📍 Bengaluru
🚀 End-to-end support available

Setting up your business?
Reply to this email and we'll help you find the right starting point for {{company}}.

Regards,
Sneha
Launcherdesk
📞 +91 85488 54859
✉️ contact@launcherdesk.com
🌐 Launcherdesk.com`;

const OFFICERESTORE_TEMPLATE = `Hi {{name}},

Congratulations on your new venture!

If you're currently planning your office setup, there's a smart way to reduce your furniture budget without compromising on quality.

Officerestore provides quality refurbished office furniture at affordable prices — ideal for startups and growing businesses setting up a new workspace.

We offer:
- Office Chairs
- Workstations & Desks
- Conference Furniture
- Reception Furniture
- Storage & Cabinets
- Office Partitions & Accessories

🛒 Browse our catalogue: Officerestore.com

You can explore our products, compare options and choose furniture that fits your office and budget.

📍 Bangalore
🚚 Delivery & installation support available

Planning your office setup?
Reply to this email and we'll help you find the right furniture for your requirements.

Regards,
Officerestore Team
📞 +91 70900 33660
✉️ contact@officerestore.com
🌐 Officerestore.com`;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function StatusBadge({ status }) {
  const m = STATUS_META[status] || { color: 'secondary', label: status };
  return <span className={`badge bg-${m.color}`}>{m.label}</span>;
}

function CompanyBadge({ company }) {
  const m = COMPANY_META[company] || { color: 'secondary', emoji: '?', label: company };
  return (
    <span className={`badge bg-${m.color} bg-opacity-10 text-${m.color} border border-${m.color} border-opacity-25`}>
      {m.label}
    </span>
  );
}

function SendProgress({ stats }) {
  if (!stats || stats.total === 0) return null;
  const done = stats.sent + stats.failed;
  const pct  = Math.round((done / stats.total) * 100);
  return (
    <div>
      <div className="d-flex justify-content-between small text-muted mb-1">
        <span>{done.toLocaleString()} / {stats.total.toLocaleString()}</span>
        <span>{pct}%</span>
      </div>
      <div className="progress" style={{ height: 6 }}>
        <div className="progress-bar bg-success" style={{ width: `${Math.round((stats.sent  / stats.total) * 100)}%` }} />
        <div className="progress-bar bg-danger"  style={{ width: `${Math.round((stats.failed / stats.total) * 100)}%` }} />
      </div>
      <div className="d-flex gap-3 small mt-1">
        <span className="text-success">✓ {stats.sent.toLocaleString()} sent</span>
        {stats.failed > 0 && <span className="text-danger">✕ {stats.failed.toLocaleString()} failed</span>}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Multi-account Brevo quota panel & DKIM domain status
// ---------------------------------------------------------------------------
function BrevoStatusPanel({ company }) {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');
  const [showDns, setShowDns] = useState(false);

  useEffect(() => {
    setLoading(true); setData(null); setError('');
    api.get('/campaigns/account-status', { params: { company } })
      .then((res) => setData(res.data))
      .catch((err) => setError(err.response?.data?.error || 'Could not reach Brevo API'))
      .finally(() => setLoading(false));
  }, [company]);

  if (loading) return (
    <div className="alert alert-light border py-2 small mb-3 d-flex align-items-center gap-2">
      <span className="spinner-border spinner-border-sm" /> Checking Brevo accounts…
    </div>
  );
  if (error) return <div className="alert alert-danger py-2 small mb-3"><strong>Setup needed:</strong> {error}</div>;
  if (!data)  return null;

  const low = data.totalRemaining < 50;
  const isAuth = data.domainStatus?.authenticated === true;
  const dkim1 = data.domainStatus?.dnsRecords?.dkim1Record;
  const dkim2 = data.domainStatus?.dnsRecords?.dkim2Record;

  return (
    <div className={`alert ${low ? 'alert-warning' : 'alert-success'} py-2 small mb-3`}>
      <div className="d-flex justify-content-between align-items-center mb-2">
        <strong>{data.label} — {data.accounts.length} Brevo account{data.accounts.length !== 1 ? 's' : ''}</strong>
        <span className={low ? 'text-danger fw-bold' : 'fw-bold'}>
          {data.totalRemaining} / {data.totalCapacity} emails left this month
        </span>
      </div>
      <div className="d-flex flex-wrap gap-2 mb-2">
        {data.accounts.map((acc) => {
          const rem    = acc.quota?.remaining ?? null;
          const cap    = acc.quota?.total ?? 300;
          const pct    = cap > 0 && rem != null ? Math.round((rem / cap) * 100) : 0;
          const isExhausted = rem === 0;
          const accLow = rem != null && rem < 30;
          return (
            <div key={acc.index} className="border rounded px-2 py-1 bg-white" style={{ minWidth: 130 }}>
              <div className="d-flex justify-content-between align-items-center gap-2">
                <span className="text-muted fw-semibold">Account {acc.index}</span>
                <span className={isExhausted ? 'badge bg-danger' : (accLow ? 'badge bg-warning text-dark' : 'badge bg-success')}>
                  {rem != null ? (isExhausted ? '0 left (exhausted)' : `${rem} left`) : '…'}
                </span>
              </div>
              <div className="progress mt-1" style={{ height: 4 }}>
                <div className={`progress-bar ${isExhausted ? 'bg-danger' : (accLow ? 'bg-warning' : 'bg-success')}`} style={{ width: `${pct}%` }} />
              </div>
              <div className="text-muted" style={{ fontSize: 10 }}>{pct}% remaining</div>
            </div>
          );
        })}
      </div>

      {/* Domain DKIM status */}
      {data.domainStatus && (
        <div className="mt-2 pt-2 border-top">
          {isAuth ? (
            <div className="text-success small d-flex align-items-center gap-1">
              <span>✓</span> <strong>DKIM Authenticated:</strong> {data.fromDomain} is verified and ready for high inbox delivery.
            </div>
          ) : (
            <div className="text-danger small">
              <div className="d-flex justify-content-between align-items-center">
                <span>⚠️ <strong>DKIM Unauthenticated:</strong> {data.fromDomain} is missing DKIM CNAME records in DNS. Emails may land in Spam or be rejected by Gmail.</span>
                <button type="button" className="btn btn-sm btn-outline-danger py-0 px-2 text-nowrap ms-2" onClick={() => setShowDns(!showDns)}>
                  {showDns ? 'Hide DNS' : 'View DNS Records'}
                </button>
              </div>
              {showDns && (
                <div className="bg-white p-2 rounded border border-danger border-opacity-25 mt-2 text-dark font-monospace" style={{ fontSize: 11 }}>
                  <div className="fw-bold text-danger mb-1 font-sans-serif">Add these 2 CNAME records in Cloudflare DNS (DNS-only / grey cloud):</div>
                  <div className="mb-1"><strong>Record 1:</strong> Host: <code>{dkim1?.host_name || 'brevo1._domainkey'}</code> &rarr; Value: <code>{dkim1?.value || `b1.${data.fromDomain.replace('.', '-')}.dkim.brevo.com`}</code></div>
                  <div><strong>Record 2:</strong> Host: <code>{dkim2?.host_name || 'brevo2._domainkey'}</code> &rarr; Value: <code>{dkim2?.value || `b2.${data.fromDomain.replace('.', '-')}.dkim.brevo.com`}</code></div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {low && !data.domainStatus && (
        <div className="mt-2 text-danger">
          ⚠️ Running low — add more keys in .env or wait for monthly reset.
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Stop button
// ---------------------------------------------------------------------------
function StopButton({ campaignId, onStopped }) {
  const [stopping, setStopping] = useState(false);
  const handleStop = async () => {
    if (!window.confirm('Stop this campaign? Emails already sent cannot be recalled.')) return;
    setStopping(true);
    try { await api.post(`/campaigns/${campaignId}/stop`); onStopped(); }
    catch (err) { alert(err.response?.data?.error || 'Failed to stop campaign.'); }
    finally { setStopping(false); }
  };
  return (
    <button className="btn btn-danger" onClick={handleStop} disabled={stopping}>
      {stopping ? <><span className="spinner-border spinner-border-sm me-2" />Stopping…</> : 'Stop campaign'}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Helpers — load/save company defaults from localStorage
// ---------------------------------------------------------------------------
const LS_KEY = (company, field) => `bulkemail_${company}_${field}`;

function loadDefault(company, field, fallback = '') {
  try { return localStorage.getItem(LS_KEY(company, field)) || fallback; } catch { return fallback; }
}
function saveDefault(company, field, value) {
  try { localStorage.setItem(LS_KEY(company, field), value); } catch { /**/ }
}

// Default subjects per company
const DEFAULT_SUBJECTS = {
  launcherdesk:  'Complete digital & business setup for your new venture — Launcherdesk',
  officerestore: 'Quality office furniture for your new workspace — Officerestore',
};
const DEFAULT_FROM_NAMES = {
  launcherdesk:  'Sneha',
  officerestore: 'Sneha',
};

// ---------------------------------------------------------------------------
// CompanySenderConfig — locked "From name" and "Subject" with Edit button
// ---------------------------------------------------------------------------
function CompanySenderConfig({ company, subject, fromName, onSubjectChange, onFromNameChange }) {
  const [editingSubject,  setEditingSubject]  = useState(false);
  const [editingFromName, setEditingFromName] = useState(false);
  const [localSubject,  setLocalSubject]  = useState(subject);
  const [localFromName, setLocalFromName] = useState(fromName);

  // Sync if parent changes (e.g. company switch)
  useEffect(() => { setLocalSubject(subject);   setEditingSubject(false);  }, [subject]);
  useEffect(() => { setLocalFromName(fromName); setEditingFromName(false); }, [fromName]);

  const saveSubject = () => {
    onSubjectChange(localSubject);
    saveDefault(company, 'subject', localSubject);
    setEditingSubject(false);
  };

  const saveFromName = () => {
    onFromNameChange(localFromName);
    saveDefault(company, 'fromName', localFromName);
    setEditingFromName(false);
  };

  return (
    <div className="mb-3 p-3 border rounded bg-light">
      <div className="d-flex justify-content-between align-items-center mb-1">
        <span className="small text-muted text-uppercase fw-semibold">Sender & Subject</span>
        <span className="small text-muted">Saved per company — click Edit to change</span>
      </div>

      {/* From name row */}
      <div className="d-flex align-items-center gap-2 mb-2">
        <span className="small text-muted" style={{ minWidth: 80 }}>From name</span>
        {editingFromName ? (
          <>
            <input
              type="text"
              className="form-control form-control-sm flex-grow-1"
              value={localFromName}
              onChange={(e) => setLocalFromName(e.target.value)}
              autoFocus
              onKeyDown={(e) => { if (e.key === 'Enter') saveFromName(); if (e.key === 'Escape') setEditingFromName(false); }}
            />
            <button className="btn btn-success btn-sm" onClick={saveFromName}>Save</button>
            <button className="btn btn-outline-secondary btn-sm" onClick={() => { setLocalFromName(fromName); setEditingFromName(false); }}>Cancel</button>
          </>
        ) : (
          <>
            <span className="fw-medium flex-grow-1">{fromName || <span className="text-muted fst-italic">Not set</span>}</span>
            <button className="btn btn-outline-secondary btn-sm" onClick={() => setEditingFromName(true)}>Edit</button>
          </>
        )}
      </div>

      {/* Subject row */}
      <div className="d-flex align-items-start gap-2">
        <span className="small text-muted mt-1" style={{ minWidth: 80 }}>Subject</span>
        {editingSubject ? (
          <>
            <input
              type="text"
              className="form-control form-control-sm flex-grow-1"
              value={localSubject}
              onChange={(e) => setLocalSubject(e.target.value)}
              autoFocus
              onKeyDown={(e) => { if (e.key === 'Enter') saveSubject(); if (e.key === 'Escape') setEditingSubject(false); }}
            />
            <button className="btn btn-success btn-sm" onClick={saveSubject}>Save</button>
            <button className="btn btn-outline-secondary btn-sm" onClick={() => { setLocalSubject(subject); setEditingSubject(false); }}>Cancel</button>
          </>
        ) : (
          <>
            <span className="fw-medium flex-grow-1" style={{ wordBreak: 'break-word' }}>{subject || <span className="text-muted fst-italic">Not set</span>}</span>
            <button className="btn btn-outline-secondary btn-sm" onClick={() => setEditingSubject(true)}>Edit</button>
          </>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// New Campaign Modal
// ---------------------------------------------------------------------------
function NewCampaignModal({ onCreated, onClose, defaultCompany = 'launcherdesk' }) {
  const [company, setCompany]           = useState(defaultCompany);

  // Per-company form storage — switching tabs saves and restores each company's form
  // subject and fromName are loaded from localStorage (persisted across modal open/close)
  const getTemplate = (co) => co === 'officerestore' ? OFFICERESTORE_TEMPLATE : LAUNCHERDESK_TEMPLATE;

  const EMPTY_FORM = (co) => ({
    name: '', status: 'active', importBatch: '', search: '', states: [],
    body:     loadDefault(co, 'body',     getTemplate(co)),
    subject:  loadDefault(co, 'subject',  DEFAULT_SUBJECTS[co]  || ''),
    fromName: loadDefault(co, 'fromName', DEFAULT_FROM_NAMES[co] || ''),
  });
  const [forms, setForms] = useState({
    launcherdesk:  EMPTY_FORM('launcherdesk'),
    officerestore: EMPTY_FORM('officerestore'),
  });

  // Current form is always the active company's form
  const form = forms[company] || EMPTY_FORM(company);
  const [statesData, setStatesData]       = useState([]);   // [{state, count}]
  const [blastedStates, setBlastedStates] = useState([]);   // states already blasted for selected batch
  const [manualStates, setManualStates]   = useState([]);   // manually marked states (subset of blastedStates)
  const [allBlasted, setAllBlasted]       = useState(false);// true if entire batch was blasted
  const [markingState, setMarkingState]   = useState(null); // which state is being marked/unmarked
  const [stateSearch, setStateSearch]     = useState('');
  const [statesLoading, setStatesLoading] = useState(false);
  const [preview, setPreview]           = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [submitting, setSubmitting]     = useState(false);
  const [error, setError]               = useState('');
  const [pdfFile, setPdfFile]           = useState(null);
  const [testEmail, setTestEmail]       = useState('');
  const [testSending, setTestSending]   = useState(false);
  const [testResult, setTestResult]     = useState(null);
  const pdfInputRef = useRef();
  const debounceRef = useRef();

  const fetchPreview = useCallback(async (f) => {
    setPreviewLoading(true);
    try {
      const params = {
        status: f.status,
        search: f.search,
        importBatch: f.importBatch,
        ...(f.states && f.states.length > 0 ? { state: f.states.join(',') } : {}),
      };
      const { data } = await api.get('/campaigns/preview-count', { params });
      setPreview(data);
    } catch { setPreview(null); }
    finally { setPreviewLoading(false); }
  }, []);

  const loadStates = useCallback(async () => {
    setStatesLoading(true);
    try {
      const { data } = await api.get('/campaigns/states');
      setStatesData(data.states || []);  // [{state, count}]
    } catch { setStatesData([]); }
    finally { setStatesLoading(false); }
  }, []);

  // Fetch which states are already blasted for the selected importBatch
  const fetchBlastedStates = useCallback(async (importBatch, co) => {
    if (!importBatch) {
      setBlastedStates([]);
      setManualStates([]);
      setAllBlasted(false);
      return;
    }
    try {
      const { data } = await api.get('/campaigns/blasted-states', {
        params: { importBatch, company: co },
      });
      setBlastedStates(data.blastedStates || []);
      setManualStates(data.manualStates   || []);
      setAllBlasted(data.allBlasted || false);
    } catch {
      setBlastedStates([]);
      setManualStates([]);
      setAllBlasted(false);
    }
  }, []);

  useEffect(() => {
    fetchPreview(forms[defaultCompany] || EMPTY_FORM(defaultCompany));
    loadStates();
  }, []); // eslint-disable-line

  // Updates the active company's form only — other company's form untouched
  const handleChange = (field, value) => {
    const next = { ...form, [field]: value };
    setForms((prev) => ({ ...prev, [company]: next }));
    if (['status', 'importBatch', 'search', 'states'].includes(field)) {
      clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => fetchPreview(next), 400);
    }
    // Persist body edits per company so they survive modal re-open
    if (field === 'body') {
      saveDefault(company, 'body', value);
    }
    // When batch changes, reload blasted states for that batch
    if (field === 'importBatch') {
      fetchBlastedStates(value, company);
      // Deselect any states that are now blasted
      if (next.states && next.states.length > 0) {
        setForms((prev) => ({ ...prev, [company]: { ...next, states: [] } }));
      }
    }
  };

  const toggleState = (state) => {
    // Blocked states cannot be toggled
    if (blastedStates.includes(state)) return;
    const current = form.states || [];
    const next = current.includes(state)
      ? current.filter((s) => s !== state)
      : [...current, state];
    handleChange('states', next);
  };

  // Manually mark a state as already sent
  const handleMarkBlasted = async (state) => {
    const importBatch = form.importBatch;
    if (!importBatch) {
      alert('Please select an import batch first.');
      return;
    }
    if (!window.confirm(`Mark "${state}" as already sent for this batch? It will be locked from future blasting.`)) return;
    setMarkingState(state);
    try {
      await api.post('/campaigns/manual-blast', { importBatch, company, state });
      await fetchBlastedStates(importBatch, company);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to mark state.');
    } finally {
      setMarkingState(null);
    }
  };

  // Unmark a manually marked state
  const handleUnmarkBlasted = async (state) => {
    const importBatch = form.importBatch;
    if (!window.confirm(`Unmark "${state}"? It will be available for blasting again.`)) return;
    setMarkingState(state);
    try {
      await api.delete('/campaigns/manual-blast', { data: { importBatch, company, state } });
      await fetchBlastedStates(importBatch, company);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to unmark state.');
    } finally {
      setMarkingState(null);
    }
  };

  const handleCompanyChange = (co) => {
    setCompany(co);
    setTestResult(null);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchPreview(forms[co] || EMPTY_FORM(co)), 100);
    // Reload blasted states for the new company + current batch
    const batch = (forms[co] || EMPTY_FORM(co)).importBatch || '';
    fetchBlastedStates(batch, co);
  };

  const handleSubmit = async () => {
    if (!form.name || !form.subject || !form.body) { setError('Campaign name, subject, and body are required.'); return; }
    if (preview?.count === 0) { setError('No leads match the selected filter.'); return; }
    setSubmitting(true); setError('');
    try {
      const fd = new FormData();
      fd.append('name', form.name); fd.append('subject', form.subject);
      fd.append('body', form.body); fd.append('fromName', form.fromName);
      fd.append('company', company);
      fd.append('targetFilter', JSON.stringify({ status: form.status, search: form.search, importBatch: form.importBatch, state: form.states && form.states.length > 0 ? form.states : undefined }));
      if (pdfFile) fd.append('attachment', pdfFile);
      await api.post('/campaigns', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      onCreated(); onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create campaign.');
    } finally { setSubmitting(false); }
  };

  const handleTestSend = async () => {
    if (!form.subject || !form.body) { setTestResult({ ok: false, msg: 'Fill in subject and body first.', tips: [] }); return; }
    if (!testEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(testEmail)) { setTestResult({ ok: false, msg: 'Enter a valid email.', tips: [] }); return; }
    setTestSending(true); setTestResult(null);
    try {
      const fd = new FormData();
      fd.append('subject', form.subject); fd.append('body', form.body);
      fd.append('fromName', form.fromName); fd.append('testEmail', testEmail);
      fd.append('company', company);
      if (pdfFile) fd.append('attachment', pdfFile);
      const { data } = await api.post('/campaigns/test', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setTestResult({ ok: true, msg: data.message, tips: data.tips || [], messageId: data.messageId });
    } catch (err) {
      setTestResult({ ok: false, msg: err.response?.data?.error || 'Test send failed.', tips: [] });
    } finally { setTestSending(false); }
  };

  const companyMeta = COMPANY_META[company] || COMPANY_META.launcherdesk;

  return (
    <div className="modal show d-block" style={{ background: 'rgba(0,0,0,.5)' }}
      onClick={(e) => e.target === e.currentTarget && !submitting && onClose()}>
      <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title mb-0">New Email Blast</h5>
            <button className="btn-close" onClick={onClose} disabled={submitting} />
          </div>

          <div className="modal-body">

            {/* ── Company selector ── */}
            <h6 className="text-muted text-uppercase small fw-semibold mb-2">Send from company</h6>
            <div className="d-flex gap-2 mb-3">
              {Object.entries(COMPANY_META).map(([key, meta]) => (
                <button
                  key={key}
                  type="button"
                  className={`btn btn-${company === key ? meta.color : 'outline-' + meta.color} flex-fill py-2`}
                  onClick={() => handleCompanyChange(key)}
                >
                  <div className="fw-bold">{meta.label}</div>
                  <div className="small opacity-75">
                    {key === 'launcherdesk' ? 'sneha@launcherdesk.net' : 'sneha@officerestore.in'}
                  </div>
                </button>
              ))}
            </div>

            {/* Brevo status for selected company */}
            <BrevoStatusPanel company={company} />

            {/* ── Campaign details ── */}
            <h6 className="text-muted text-uppercase small fw-semibold mb-3">Campaign details</h6>

            <div className="mb-3">
              <label className="form-label fw-medium">Campaign name <span className="text-danger">*</span></label>
              <input type="text" className="form-control" placeholder="e.g. August Outreach"
                value={form.name} onChange={(e) => handleChange('name', e.target.value)} />
            </div>

            <CompanySenderConfig
              company={company}
              subject={form.subject}
              fromName={form.fromName}
              onSubjectChange={(val) => handleChange('subject', val)}
              onFromNameChange={(val) => handleChange('fromName', val)}
            />

            <div className="mb-3">
              <div className="d-flex justify-content-between align-items-center mb-1">
                <label className="form-label fw-medium mb-0">Email body <span className="text-danger">*</span></label>
                <button type="button" className={`btn btn-outline-${companyMeta.color} btn-sm`}
                  onClick={() => {
                    const defaultSubject = DEFAULT_SUBJECTS[company] || '';
                    const defaultBody = getTemplate(company);
                    handleChange('subject', defaultSubject);
                    handleChange('body', defaultBody);
                    saveDefault(company, 'subject', defaultSubject);
                    saveDefault(company, 'body', defaultBody);
                  }}>
                  ↺ Reset to default template
                </button>
              </div>
              <textarea className="form-control font-monospace" rows={12}
                placeholder="Paste your email body here…"
                value={form.body} onChange={(e) => handleChange('body', e.target.value)}
                style={{ fontSize: 12 }} />
              <div className="form-text">Plain text recommended. Use <code>{'{{name}}'}</code>, <code>{'{{company}}'}</code> for personalisation.</div>
            </div>

            {/* PDF attachment */}
            <div className="mb-4">
              <label className="form-label fw-medium">
                PDF attachment <span className="text-muted small">(optional — increases spam score)</span>
              </label>
              <div className="alert alert-warning py-2 small mb-2">
                <strong>Tip:</strong> The default template includes company profile inline. Only attach PDF after a lead has replied.
              </div>
              <div className="d-flex align-items-center gap-2">
                <input ref={pdfInputRef} type="file" accept="application/pdf,.pdf,.doc,.docx" className="d-none"
                  onChange={(e) => { const f = e.target.files?.[0] || null; if (f && f.size > 10*1024*1024) { alert('Max 10 MB'); e.target.value = ''; return; } setPdfFile(f); setTestResult(null); }} />
                <button type="button" className="btn btn-outline-secondary btn-sm"
                  onClick={() => pdfInputRef.current?.click()}>
                  {pdfFile ? 'Change file' : 'Attach PDF / Word'}
                </button>
                {pdfFile && (
                  <div className="d-flex align-items-center gap-2">
                    <span className="badge bg-success">{pdfFile.name} ({(pdfFile.size/1024).toFixed(0)} KB)</span>
                    <button type="button" className="btn btn-link btn-sm text-danger p-0"
                      onClick={() => { setPdfFile(null); if (pdfInputRef.current) pdfInputRef.current.value = ''; }}>
                      Remove
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Test send */}
            <h6 className="text-muted text-uppercase small fw-semibold mb-3">Test before blasting</h6>
            <div className="mb-4 p-3 border rounded bg-light">
              <p className="small text-muted mb-2">
                Sends the exact email from <strong className={`text-${companyMeta.color}`}>
                  {company === 'officerestore' ? 'sneha@officerestore.in' : 'sneha@launcherdesk.net'}
                </strong>. Check Primary and Promotions tabs.
              </p>
              <div className="input-group">
                <input type="email" className="form-control" placeholder="your@email.com"
                  value={testEmail}
                  onChange={(e) => { setTestEmail(e.target.value); setTestResult(null); }}
                  disabled={testSending} />
                <button className="btn btn-outline-secondary" onClick={handleTestSend} disabled={testSending || !testEmail}>
                  {testSending ? <><span className="spinner-border spinner-border-sm me-1" />Sending…</> : 'Send test'}
                </button>
              </div>

              {testResult && (
                <div className="mt-2">
                  <div className={`alert alert-${testResult.ok ? 'success' : 'danger'} py-2 mb-0 small`}>
                    {testResult.ok ? 'Sent — ' : 'Failed — '}{testResult.msg}
                    {testResult.messageId && <div className="text-muted mt-1" style={{ fontSize: 11 }}>Brevo ID: {testResult.messageId}</div>}
                  </div>
                  {testResult.ok && testResult.tips?.length > 0 && (
                    <div className="alert alert-info py-2 mt-1 mb-0 small">
                      <strong>Where to find it:</strong>
                      <ul className="mb-0 mt-1 ps-3">{testResult.tips.map((t, i) => <li key={i}>{t}</li>)}</ul>
                    </div>
                  )}
                  {!testResult.ok && (
                    <div className="alert alert-light border py-2 mt-1 mb-0 small">
                      Check: API key in .env, sender verified in Brevo, server restarted after .env change.
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Targeting */}
            <h6 className="text-muted text-uppercase small fw-semibold mb-3">Targeting</h6>
            <div className="row g-3 mb-3">
              <div className="col-md-4">
                <label className="form-label fw-medium">Lead status</label>
                <select className="form-select" value={form.status} onChange={(e) => handleChange('status', e.target.value)}>
                  <option value="active">Active only</option>
                  <option value="all">All statuses</option>
                </select>
              </div>
              <div className="col-md-8">
                <label className="form-label fw-medium">Filter by import batch</label>
                <select className="form-select" value={form.importBatch} onChange={(e) => handleChange('importBatch', e.target.value)}>
                  <option value="">All batches (entire list)</option>
                  {(preview?.batches || []).map((b) => (
                    <option key={b} value={b}>{new Date(b).toLocaleString()} import</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="mb-3">
              <label className="form-label fw-medium">Keyword filter <span className="text-muted small">(optional)</span></label>
              <input type="search" className="form-control" placeholder="Search by name, email, or company…"
                value={form.search} onChange={(e) => handleChange('search', e.target.value)} />
            </div>

            {/* State filter */}
            <div className="mb-3">
              <div className="d-flex justify-content-between align-items-center mb-2">
                <label className="form-label fw-medium mb-0">
                  Filter by state
                  <span className="text-muted small ms-1">(leave empty = all states)</span>
                </label>
                {form.states && form.states.length > 0 && (
                  <button type="button" className="btn btn-link btn-sm p-0 text-danger"
                    onClick={() => handleChange('states', [])}>
                    Clear all ({form.states.length} selected)
                  </button>
                )}
              </div>

              {statesLoading ? (
                <div className="text-muted small d-flex align-items-center gap-2">
                  <span className="spinner-border spinner-border-sm" />
                  Analysing states from your leads…
                </div>
              ) : statesData.length === 0 ? (
                <div className="alert alert-light border py-2 small">
                  No state data found in your leads yet. Import an Excel sheet that has a <code>state</code> or <code>State</code> column — states will appear here automatically.
                </div>
              ) : (
                <>
                  {/* All blasted warning */}
                  {allBlasted && (
                    <div className="alert alert-warning py-2 small mb-2 d-flex align-items-center gap-2">
                      <span>🔒</span>
                      <div>
                        <strong>All leads in this batch have already been blasted.</strong>
                        {' '}Select a different import batch to send again.
                      </div>
                    </div>
                  )}

                  {/* Blasted count info */}
                  {!allBlasted && blastedStates.length > 0 && (
                    <div className="alert alert-info py-2 small mb-2">
                      🔒 <strong>{blastedStates.length} state{blastedStates.length > 1 ? 's' : ''} already blasted</strong> for this batch — locked to prevent duplicate sending.
                      {' '}Select from the remaining unlocked states.
                    </div>
                  )}

                  {/* Search box */}
                  <input
                    type="search"
                    className="form-control form-control-sm mb-2"
                    placeholder={`Search across ${statesData.length} states…`}
                    value={stateSearch}
                    onChange={(e) => setStateSearch(e.target.value)}
                  />

                  {/* State tiles — each shows name + lead count */}
                  <div className="d-flex flex-wrap gap-2" style={{ maxHeight: 220, overflowY: 'auto', padding: '2px' }}>
                    {statesData
                      .filter((s) => s.state.toLowerCase().includes(stateSearch.toLowerCase()))
                      .map(({ state, count }) => {
                        const selected  = (form.states || []).includes(state);
                        const blasted   = blastedStates.includes(state);
                        const isManual  = manualStates.includes(state);
                        const isMarking = markingState === state;

                        return (
                          <div
                            key={state}
                            className={`position-relative border rounded px-3 pt-2 pb-2 ${
                              blasted  ? 'bg-light border-secondary opacity-75' :
                              selected ? 'bg-primary border-primary text-white' : 'border-secondary'
                            }`}
                            style={{ minWidth: 120, cursor: blasted ? 'default' : 'pointer' }}
                            onClick={() => !blasted && toggleState(state)}
                          >
                            {/* Toggle switch — top right — only when batch selected */}
                            {form.importBatch && (
                              <div
                                className="position-absolute d-flex align-items-center gap-1"
                                style={{ top: 5, right: 6 }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (isMarking) return;
                                  if (blasted && isManual) handleUnmarkBlasted(state);
                                  else if (!blasted) handleMarkBlasted(state);
                                }}
                                title={blasted ? (isManual ? 'Click to unmark' : 'Auto-blasted, cannot unmark') : 'Mark as already sent'}
                              >
                                <span style={{ fontSize: 9, color: blasted ? '#6c757d' : selected ? 'rgba(255,255,255,0.7)' : '#aaa' }}>
                                  {blasted ? 'sent' : 'unsent'}
                                </span>
                                {/* Toggle pill */}
                                <div
                                  style={{
                                    width: 28, height: 15, borderRadius: 8,
                                    background: blasted ? '#6c757d' : '#dee2e6',
                                    position: 'relative',
                                    cursor: (blasted && !isManual) ? 'not-allowed' : 'pointer',
                                    transition: 'background 0.2s',
                                    flexShrink: 0,
                                  }}
                                >
                                  <div style={{
                                    width: 11, height: 11, borderRadius: '50%',
                                    background: '#fff',
                                    position: 'absolute',
                                    top: 2,
                                    left: blasted ? 15 : 2,
                                    transition: 'left 0.2s',
                                    boxShadow: '0 1px 2px rgba(0,0,0,0.25)',
                                  }} />
                                </div>
                                {isMarking && <span className="spinner-border spinner-border-sm" style={{ width: 10, height: 10, borderWidth: 1 }} />}
                              </div>
                            )}

                            {/* State name */}
                            <div className="fw-medium" style={{ fontSize: 12, paddingRight: form.importBatch ? 52 : 0 }}>
                              {blasted ? '🔒 ' : ''}{state}
                            </div>

                            {/* Lead count / status */}
                            <div className={`mt-1 ${blasted ? 'text-muted' : selected ? 'text-white-50' : 'text-muted'}`} style={{ fontSize: 11 }}>
                              {isMarking ? 'updating…' : blasted ? (isManual ? 'marked by you' : 'already sent') : `${count.toLocaleString()} leads`}
                            </div>
                          </div>
                        );
                      })}
                  </div>

                  {/* Selected summary */}
                  {form.states && form.states.length > 0 && (
                    <div className="mt-2 p-2 rounded bg-primary bg-opacity-10 small">
                      <strong>Selected:</strong>{' '}
                      {form.states.map((s) => {
                        const found = statesData.find((d) => d.state === s);
                        return (
                          <span key={s} className="badge bg-primary me-1">
                            {s} {found ? `(${found.count.toLocaleString()})` : ''}
                          </span>
                        );
                      })}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Count */}
            <div className={`alert ${preview?.count === 0 ? 'alert-warning' : 'alert-info'} py-2 d-flex align-items-center gap-2`}>
              {previewLoading
                ? <><span className="spinner-border spinner-border-sm" /> Counting leads…</>
                : preview
                  ? <><strong>{preview.count.toLocaleString()}</strong> email{preview.count !== 1 ? 's' : ''} will be sent{preview.count === 0 ? ' — adjust filters' : ''}</>
                  : '—'}
            </div>

            {error && <div className="alert alert-danger py-2">{error}</div>}
          </div>

          <div className="modal-footer">
            <button className="btn btn-secondary" onClick={onClose} disabled={submitting}>Cancel</button>
            <button className={`btn btn-${companyMeta.color}`} onClick={handleSubmit}
              disabled={submitting || previewLoading || preview?.count === 0 || allBlasted}
              title={allBlasted ? 'All leads in this batch have already been blasted' : ''}>
              {submitting
                ? <><span className="spinner-border spinner-border-sm me-2" />Launching…</>
                : `Send blast${preview?.count > 0 ? ` to ${preview.count.toLocaleString()}` : ''} (${companyMeta.label})`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Campaign detail modal
// ---------------------------------------------------------------------------
function CampaignDetailModal({ campaignId, onClose }) {
  const [campaign, setCampaign] = useState(null);
  const intervalRef = useRef();

  const fetchCampaign = useCallback(async () => {
    try {
      const { data } = await api.get(`/campaigns/${campaignId}`);
      setCampaign(data.campaign);
      if (data.campaign.status !== 'sending') clearInterval(intervalRef.current);
    } catch { /**/ }
  }, [campaignId]);

  useEffect(() => {
    fetchCampaign();
    intervalRef.current = setInterval(fetchCampaign, 3000);
    return () => clearInterval(intervalRef.current);
  }, [fetchCampaign]);

  if (!campaign) return (
    <div className="modal show d-block" style={{ background: 'rgba(0,0,0,.5)' }}>
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content p-4 text-center"><div className="spinner-border mx-auto" /></div>
      </div>
    </div>
  );

  const tf = campaign.targetFilter || {};

  return (
    <div className="modal show d-block" style={{ background: 'rgba(0,0,0,.5)' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-dialog modal-lg modal-dialog-centered">
        <div className="modal-content">
          <div className="modal-header">
            <div>
              <h5 className="modal-title mb-1">{campaign.name}</h5>
              <div className="d-flex gap-2">
                <StatusBadge status={campaign.status} />
                <CompanyBadge company={campaign.company} />
              </div>
            </div>
            <button className="btn-close" onClick={onClose} />
          </div>
          <div className="modal-body">
            <div className="row g-3 mb-4">
              <div className="col-md-6">
                <p className="text-muted small mb-1">Subject</p>
                <p className="mb-0 fw-medium">{campaign.subject}</p>
              </div>
              <div className="col-md-3">
                <p className="text-muted small mb-1">Created</p>
                <p className="mb-0">{new Date(campaign.createdAt).toLocaleString()}</p>
              </div>
              <div className="col-md-3">
                <p className="text-muted small mb-1">Sent at</p>
                <p className="mb-0">{campaign.sentAt ? new Date(campaign.sentAt).toLocaleString() : '—'}</p>
              </div>
            </div>
            {campaign.attachment?.filename && (
              <div className="mb-3">
                <p className="text-muted small mb-1">Attachment</p>
                <span className="badge bg-secondary">{campaign.attachment.filename}</span>
              </div>
            )}
            <h6 className="fw-semibold mb-2">Sending progress</h6>
            <SendProgress stats={campaign.stats} />
            {campaign.stats?.failed > 0 && campaign.stats?.lastError && (
              <div className="alert alert-warning py-2 small mt-2">
                <strong>Status:</strong> {campaign.stats.lastError}
              </div>
            )}
            {campaign.stats?.failed > 0 && campaign.stats?.lastError && (
              <div className="alert alert-warning py-2 small mt-2">
                <strong>Last failure reason:</strong> {campaign.stats.lastError}
                <div className="mt-1 text-muted">
                  Check your server terminal for full details: <code>[campaign] Failed →</code> lines show each failed email and why.
                </div>
              </div>
            )}
            <hr />
            <h6 className="fw-semibold mb-2">Targeting</h6>
            <div className="d-flex flex-wrap gap-2">
              <span className="badge bg-light text-dark border">Status: {tf.status || 'active'}</span>
              {tf.importBatch && <span className="badge bg-light text-dark border">Batch: {new Date(tf.importBatch).toLocaleString()}</span>}
              {tf.search && <span className="badge bg-light text-dark border">Search: "{tf.search}"</span>}
            </div>
            <hr />
            <h6 className="fw-semibold mb-2">Email body preview</h6>
            <div className="border rounded p-3 bg-light" style={{ maxHeight: 250, overflow: 'auto', fontSize: 13 }}
              dangerouslySetInnerHTML={{ __html: campaign.body.replace(/\n/g, '<br>') }} />
          </div>
          <div className="modal-footer d-flex justify-content-between">
            <div>
              {campaign.status === 'sending' && (
                <StopButton campaignId={campaign._id} onStopped={fetchCampaign} />
              )}
            </div>
            <button className="btn btn-secondary" onClick={onClose}>Close</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Campaigns page
// ---------------------------------------------------------------------------
export default function Campaigns() {
  const [activeCompany, setActiveCompany] = useState('launcherdesk');
  const [campaigns, setCampaigns]         = useState([]);
  const [pagination, setPagination]       = useState({ page: 1, pages: 1, total: 0 });
  const [loading, setLoading]             = useState(true);
  const [page, setPage]                   = useState(1);
  const [showNew, setShowNew]             = useState(false);
  const [detailId, setDetailId]           = useState(null);
  const [stopping, setStopping]           = useState(null);

  const fetchCampaigns = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/campaigns', { params: { page, company: activeCompany } });
      setCampaigns(data.campaigns);
      setPagination(data.pagination);
    } catch { /**/ } finally { setLoading(false); }
  }, [page, activeCompany]);

  useEffect(() => { fetchCampaigns(); }, [fetchCampaigns]);

  // Poll sending campaigns
  useEffect(() => {
    const hasSending = campaigns.some((c) => c.status === 'sending');
    if (!hasSending) return;
    const id = setInterval(fetchCampaigns, 5000);
    return () => clearInterval(id);
  }, [campaigns, fetchCampaigns]);

  const handleCompanyTab = (co) => {
    setActiveCompany(co);
    setPage(1);
  };

  const handleStop = async (e, campaignId) => {
    e.stopPropagation();
    if (!window.confirm('Stop this campaign?')) return;
    setStopping(campaignId);
    try { await api.post(`/campaigns/${campaignId}/stop`); await fetchCampaigns(); }
    catch (err) { alert(err.response?.data?.error || 'Failed to stop.'); }
    finally { setStopping(null); }
  };

  const activeMeta = COMPANY_META[activeCompany] || COMPANY_META.launcherdesk;

  return (
    <>
      {showNew && <NewCampaignModal defaultCompany={activeCompany} onCreated={fetchCampaigns} onClose={() => setShowNew(false)} />}
      {detailId && <CampaignDetailModal campaignId={detailId} onClose={() => setDetailId(null)} />}

      <div className="container-fluid py-4 px-4">

        {/* ── Company tabs ── */}
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h4 className="fw-bold mb-0">Campaigns</h4>
          <button className={`btn btn-${activeMeta.color}`} onClick={() => setShowNew(true)}>
            + New blast ({activeMeta.label})
          </button>
        </div>

        <ul className="nav nav-tabs mb-3">
          {Object.entries(COMPANY_META).map(([key, meta]) => (
            <li key={key} className="nav-item">
              <button
                className={`nav-link ${activeCompany === key ? 'active fw-semibold' : ''}`}
                onClick={() => handleCompanyTab(key)}
              >
                <span className={`text-${meta.color}`}>{meta.label}</span>
                {activeCompany === key && pagination.total > 0 && (
                  <span className={`badge bg-${meta.color} ms-2`}>{pagination.total}</span>
                )}
              </button>
            </li>
          ))}
        </ul>

        {/* ── Table ── */}
        <div className="table-responsive rounded border">
          <table className="table table-hover align-middle mb-0">
            <thead className="table-light">
              <tr>
                <th>Campaign</th>
                <th>Subject</th>
                <th>Status</th>
                <th>Recipients</th>
                <th>Sent</th>
                <th>Failed</th>
                <th>Created</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="text-center py-5 text-muted">
                  <span className="spinner-border spinner-border-sm me-2" />Loading…
                </td></tr>
              ) : campaigns.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-5 text-muted">
                  No {activeMeta.label} campaigns yet.{' '}
                  <button className="btn btn-link p-0" onClick={() => setShowNew(true)}>Create one</button>
                </td></tr>
              ) : campaigns.map((c) => (
                <tr key={c._id} style={{ cursor: 'pointer' }} onClick={() => setDetailId(c._id)}>
                  <td className="fw-medium">
                    {c.name}
                    {c.attachment?.filename && <span className="ms-1 text-muted" title={c.attachment.filename}>📎</span>}
                  </td>
                  <td className="text-muted">{c.subject}</td>
                  <td><StatusBadge status={c.status} /></td>
                  <td>{(c.stats?.total  || 0).toLocaleString()}</td>
                  <td className="text-success">{(c.stats?.sent   || 0).toLocaleString()}</td>
                  <td className={c.stats?.failed > 0 ? 'text-danger' : 'text-muted'}>
                    {(c.stats?.failed || 0).toLocaleString()}
                  </td>
                  <td className="text-muted small">{new Date(c.createdAt).toLocaleDateString()}</td>
                  <td onClick={(e) => e.stopPropagation()}>
                    {c.status === 'sending' && (
                      <button className="btn btn-danger btn-sm"
                        onClick={(e) => handleStop(e, c._id)} disabled={stopping === c._id}>
                        {stopping === c._id ? <span className="spinner-border spinner-border-sm" /> : 'Stop'}
                      </button>
                    )}
                    {c.status === 'stopped' && <span className="badge bg-dark">Stopped</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {pagination.pages > 1 && (
          <nav className="mt-3">
            <ul className="pagination pagination-sm justify-content-end mb-0">
              <li className={`page-item ${page === 1 ? 'disabled' : ''}`}>
                <button className="page-link" onClick={() => setPage(page - 1)}>Prev</button>
              </li>
              {Array.from({ length: pagination.pages }, (_, i) => i + 1).map((p) => (
                <li key={p} className={`page-item ${p === page ? 'active' : ''}`}>
                  <button className="page-link" onClick={() => setPage(p)}>{p}</button>
                </li>
              ))}
              <li className={`page-item ${page === pagination.pages ? 'disabled' : ''}`}>
                <button className="page-link" onClick={() => setPage(page + 1)}>Next</button>
              </li>
            </ul>
          </nav>
        )}
      </div>
    </>
  );
}