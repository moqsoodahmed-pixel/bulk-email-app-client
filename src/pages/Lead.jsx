import { useState, useEffect, useRef, useCallback } from 'react';
import api from '../services/api';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STATUS_BADGE = { active: 'success', unsubscribed: 'warning', bounced: 'danger' };

const RESOLUTION_META = {
  new:        { label: 'New',             color: 'success',   icon: '✦', tip: 'Will be inserted.' },
  exact:      { label: 'Exact duplicate', color: 'warning',   icon: '=', tip: 'Same email already exists.' },
  canonical:  { label: 'Alias match',     color: 'info',      icon: '≈', tip: 'Different spelling, same inbox.' },
  withinFile: { label: 'In-file dupe',    color: 'secondary', icon: '↩', tip: 'Duplicate of another row in this file.' },
  invalid:    { label: 'Invalid',         color: 'danger',    icon: '✕', tip: 'No valid email found.' },
};

// ---------------------------------------------------------------------------
// Small reusable bits
// ---------------------------------------------------------------------------

function Badge({ status }) {
  return <span className={`badge bg-${STATUS_BADGE[status] ?? 'secondary'}`}>{status}</span>;
}

function ResBadge({ resolution }) {
  const m = RESOLUTION_META[resolution] ?? { label: resolution, color: 'secondary', icon: '?' };
  return <span className={`badge bg-${m.color} bg-opacity-75`} title={m.tip}>{m.icon} {m.label}</span>;
}

// ---------------------------------------------------------------------------
// Step 1 — Drop zone
// ---------------------------------------------------------------------------

function DropZone({ onFilePicked, error }) {
  const fileRef = useRef();
  const [dragOver, setDragOver] = useState(false);
  const [file, setFile] = useState(null);

  const pick = (f) => {
    if (!f) return;
    if (!/\.(xlsx|xls|csv)$/i.test(f.name)) return;
    setFile(f);
    onFilePicked(f);
  };

  return (
    <div>
      <div
        className={`border rounded-3 p-5 text-center mb-3 ${dragOver ? 'border-primary bg-primary bg-opacity-10' : ''}`}
        style={{ cursor: 'pointer', borderStyle: dragOver ? 'solid' : 'dashed' }}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); pick(e.dataTransfer.files[0]); }}
        onClick={() => fileRef.current.click()}
      >
        <div className="fs-1 mb-2">📂</div>
        {file
          ? <p className="mb-0 fw-semibold text-success">{file.name}</p>
          : <>
              <p className="mb-1 fw-semibold">Drop your file here or click to browse</p>
              <p className="text-muted small mb-0">.xlsx, .xls, or .csv — max 10 MB</p>
            </>
        }
        <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="d-none"
          onChange={(e) => pick(e.target.files[0])} />
      </div>
      <div className="alert alert-light border small py-2">
        <strong>Expected columns (case-insensitive):</strong>{' '}
        <code>email</code> (required), <code>name</code>, <code>first name</code>,{' '}
        <code>last name</code>, <code>company</code>, <code>phone</code>
        <br />
        <span className="text-muted">🇮🇳 MCA files also supported — picks up <code>director_email</code>, <code>director_name</code>, <code>company_name</code>, <code>director_mobile</code> automatically.</span>
      </div>
      {error && <div className="alert alert-danger py-2">{error}</div>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step 2 — Preview / duplicate review
// ---------------------------------------------------------------------------

const ACTION_LABELS = {
  insert: { label: 'Insert',  color: 'outline-success' },
  update: { label: 'Update',  color: 'outline-primary' },
  skip:   { label: 'Skip',    color: 'outline-secondary' },
};

function ActionPicker({ value, onChange, resolution }) {
  // Which actions make sense for this resolution?
  const available =
    resolution === 'new'        ? ['insert', 'skip'] :
    resolution === 'exact'      ? ['skip', 'update'] :
    resolution === 'canonical'  ? ['skip', 'update', 'insert'] :
    resolution === 'withinFile' ? ['skip'] :
    ['skip']; // invalid

  return (
    <div className="btn-group btn-group-sm">
      {available.map((a) => (
        <button
          key={a}
          className={`btn btn-${value === a ? a === 'skip' ? 'secondary' : a === 'insert' ? 'success' : 'primary' : ACTION_LABELS[a].color}`}
          onClick={() => onChange(a)}
        >
          {ACTION_LABELS[a].label}
        </button>
      ))}
    </div>
  );
}

function PreviewTable({ preview, summary, actions, onActionChange, onBulkAction }) {
  const [showAll, setShowAll] = useState(false);
  const [filter, setFilter] = useState('all');

  const filtered = preview.filter((r) => filter === 'all' || r.resolution === filter);
  const visible = showAll ? filtered : filtered.slice(0, 100);

  return (
    <div>
      {/* Summary bar */}
      <div className="d-flex flex-wrap gap-2 mb-3 align-items-center">
        {Object.entries(summary).map(([res, count]) =>
          count > 0 ? (
            <button
              key={res}
              className={`btn btn-sm ${filter === res ? 'btn-dark' : 'btn-outline-secondary'}`}
              onClick={() => setFilter(filter === res ? 'all' : res)}
            >
              <ResBadge resolution={res} /> {count}
            </button>
          ) : null
        )}
        {filter !== 'all' && (
          <button className="btn btn-sm btn-link text-muted p-0" onClick={() => setFilter('all')}>
            Show all
          </button>
        )}

        {/* Bulk actions */}
        <div className="ms-auto d-flex gap-2">
          <button className="btn btn-sm btn-outline-success"
            onClick={() => onBulkAction('new', 'insert')}>
            Insert all new
          </button>
          <button className="btn btn-sm btn-outline-secondary"
            onClick={() => onBulkAction(['exact', 'canonical', 'withinFile', 'invalid'], 'skip')}>
            Skip all dupes
          </button>
          <button className="btn btn-sm btn-outline-primary"
            onClick={() => onBulkAction(['exact', 'canonical'], 'update')}>
            Update all matches
          </button>
        </div>
      </div>

      <div className="table-responsive rounded border" style={{ maxHeight: 420, overflowY: 'auto' }}>
        <table className="table table-sm table-hover align-middle mb-0">
          <thead className="table-light sticky-top">
            <tr>
              <th>#</th>
              <th>Email (incoming)</th>
              <th>Name</th>
              <th>Company</th>
              <th>Detection</th>
              <th>Existing record</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((row) => (
              <tr key={row.rowIndex}
                className={
                  row.resolution === 'invalid' ? 'table-danger' :
                  row.resolution === 'new' ? '' :
                  row.resolution === 'withinFile' ? 'table-secondary' :
                  'table-warning'
                }
              >
                <td className="text-muted small">{row.rowIndex + 1}</td>
                <td className="fw-medium" style={{ maxWidth: 200, wordBreak: 'break-all' }}>
                  {row.email || <em className="text-danger">no email</em>}
                  {row.resolution === 'canonical' && row.incoming?.canonical !== row.email && (
                    <div className="text-muted" style={{ fontSize: 11 }}>
                      canonical: {row.incoming?.canonical}
                    </div>
                  )}
                </td>
                <td className="text-muted small">{row.incoming?.name || '—'}</td>
                <td className="text-muted small">{row.incoming?.company || '—'}</td>
                <td><ResBadge resolution={row.resolution} /></td>
                <td className="small">
                  {row.existing ? (
                    <span className="text-muted">
                      {row.existing.name && <><strong>{row.existing.name}</strong><br /></>}
                      {row.existing.email}
                      {row.existing.company && <> · {row.existing.company}</>}
                    </span>
                  ) : row.resolution === 'withinFile' ? (
                    <span className="text-muted">Row {(row.duplicateOfRow ?? 0) + 1}</span>
                  ) : '—'}
                </td>
                <td>
                  <ActionPicker
                    value={actions[row.rowIndex] ?? (row.resolution === 'new' ? 'insert' : 'skip')}
                    onChange={(a) => onActionChange(row.rowIndex, a)}
                    resolution={row.resolution}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filtered.length > 100 && !showAll && (
        <button className="btn btn-sm btn-link mt-2" onClick={() => setShowAll(true)}>
          Show all {filtered.length} rows
        </button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Import modal — 3 steps: upload → preview → done
// ---------------------------------------------------------------------------

function ImportModal({ onImported, onClose }) {
  const [step, setStep] = useState('upload'); // 'upload' | 'preview' | 'done'
  const [file, setFile] = useState(null);
  const [analysing, setAnalysing] = useState(false);
  const [preview, setPreview] = useState(null); // { preview, summary }
  const [actions, setActions] = useState({});   // { rowIndex: 'insert'|'update'|'skip' }
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  // Step 1 → 2: analyse file
  const handleAnalyse = async () => {
    if (!file) return;
    setAnalysing(true);
    setError('');
    const fd = new FormData();
    fd.append('file', file);
    try {
      const { data } = await api.post('/leads/preview', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setPreview(data);

      // Set smart defaults for each row
      const defaults = {};
      data.preview.forEach((row) => {
        defaults[row.rowIndex] = row.resolution === 'new' ? 'insert' : 'skip';
      });
      setActions(defaults);
      setStep('preview');
    } catch (err) {
      setError(err.response?.data?.error ?? 'Could not analyse file.');
    } finally {
      setAnalysing(false);
    }
  };

  // Bulk-set action for rows matching certain resolutions
  const handleBulkAction = (resolutions, action) => {
    const targets = Array.isArray(resolutions) ? resolutions : [resolutions];
    setActions((prev) => {
      const next = { ...prev };
      preview.preview.forEach((row) => {
        if (targets.includes(row.resolution)) next[row.rowIndex] = action;
      });
      return next;
    });
  };

  // Step 2 → 3: commit
  const handleImport = async () => {
    setImporting(true);
    setError('');
    const fd = new FormData();
    fd.append('file', file);
    fd.append('actions', JSON.stringify(actions));
    try {
      const { data } = await api.post('/leads/import', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setResult(data);
      setStep('done');
      onImported();
    } catch (err) {
      setError(err.response?.data?.error ?? 'Import failed.');
    } finally {
      setImporting(false);
    }
  };

  // Counts for the confirm button
  const actionCounts = preview
    ? Object.values(actions).reduce((acc, a) => { acc[a] = (acc[a] || 0) + 1; return acc; }, {})
    : {};

  return (
    <div
      className="modal show d-block"
      style={{ background: 'rgba(0,0,0,.5)' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className={`modal-dialog modal-dialog-centered ${step === 'preview' ? 'modal-xl' : 'modal-lg'}`}>
        <div className="modal-content">

          {/* Header with step indicator */}
          <div className="modal-header">
            <div>
              <h5 className="modal-title mb-0">Import leads</h5>
              <div className="d-flex gap-3 mt-1">
                {['upload', 'preview', 'done'].map((s, i) => (
                  <span key={s} className={`small ${step === s ? 'fw-semibold text-primary' : 'text-muted'}`}>
                    {i + 1}. {s.charAt(0).toUpperCase() + s.slice(1)}
                  </span>
                ))}
              </div>
            </div>
            <button className="btn-close" onClick={onClose} />
          </div>

          <div className="modal-body">
            {step === 'upload' && (
              <DropZone onFilePicked={setFile} error={error} />
            )}

            {step === 'preview' && preview && (
              <PreviewTable
                preview={preview.preview}
                summary={preview.summary}
                actions={actions}
                onActionChange={(idx, action) =>
                  setActions((prev) => ({ ...prev, [idx]: action }))
                }
                onBulkAction={handleBulkAction}
              />
            )}

            {step === 'done' && result && (
              <div className="text-center py-4">
                <div className="fs-1 mb-3">✅</div>
                <h5>Import complete</h5>
                <div className="d-flex justify-content-center gap-4 mt-3">
                  <div className="text-center">
                    <div className="fs-3 fw-bold text-success">{result.inserted}</div>
                    <div className="text-muted small">inserted</div>
                  </div>
                  <div className="text-center">
                    <div className="fs-3 fw-bold text-primary">{result.updated}</div>
                    <div className="text-muted small">updated</div>
                  </div>
                  <div className="text-center">
                    <div className="fs-3 fw-bold text-secondary">{result.skipped}</div>
                    <div className="text-muted small">skipped</div>
                  </div>
                </div>
              </div>
            )}

            {error && step !== 'upload' && (
              <div className="alert alert-danger mt-3 py-2">{error}</div>
            )}
          </div>

          <div className="modal-footer">
            <button className="btn btn-secondary" onClick={onClose}>
              {step === 'done' ? 'Close' : 'Cancel'}
            </button>

            {step === 'upload' && (
              <button className="btn btn-primary" onClick={handleAnalyse} disabled={!file || analysing}>
                {analysing
                  ? <><span className="spinner-border spinner-border-sm me-2" />Analysing…</>
                  : 'Analyse file →'}
              </button>
            )}

            {step === 'preview' && (
              <>
                <button className="btn btn-outline-secondary" onClick={() => setStep('upload')}>
                  ← Back
                </button>
                <button className="btn btn-primary" onClick={handleImport} disabled={importing}>
                  {importing
                    ? <><span className="spinner-border spinner-border-sm me-2" />Importing…</>
                    : <>
                        Confirm import
                        {actionCounts.insert > 0 && <span className="ms-1 badge bg-success">{actionCounts.insert} insert</span>}
                        {actionCounts.update > 0 && <span className="ms-1 badge bg-primary">{actionCounts.update} update</span>}
                        {actionCounts.skip > 0 && <span className="ms-1 badge bg-secondary">{actionCounts.skip} skip</span>}
                      </>
                  }
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Leads page (unchanged from Phase 2, just wires in the new modal)
// ---------------------------------------------------------------------------

export default function Leads() {
  const [leads, setLeads] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState(new Set());
  const [showImport, setShowImport] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    setDeleteError('');
    try {
      const params = { page, limit: 50 };
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;
      const { data } = await api.get('/leads', { params });
      setLeads(data.leads);
      setPagination(data.pagination);
      setSelected(new Set());
    } catch {
      // 401 handled by interceptor
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter]);

  useEffect(() => { fetchLeads(); }, [fetchLeads]);

  const searchTimeout = useRef();
  const handleSearchChange = (val) => {
    setSearch(val);
    clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => setPage(1), 300);
  };

  const toggleSelect = (id) => setSelected((prev) => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  const toggleAll = () =>
    setSelected(selected.size === leads.length ? new Set() : new Set(leads.map((l) => l._id)));

  const handleBulkDelete = async () => {
    if (!window.confirm(`Delete ${selected.size} lead(s)?`)) return;
    try {
      await api.delete('/leads/bulk', { data: { ids: [...selected] } });
      fetchLeads();
    } catch (err) {
      setDeleteError(err.response?.data?.error ?? 'Delete failed.');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this lead?')) return;
    try {
      await api.delete(`/leads/${id}`);
      fetchLeads();
    } catch (err) {
      setDeleteError(err.response?.data?.error ?? 'Delete failed.');
    }
  };

  return (
    <>
      {showImport && (
        <ImportModal
          onImported={fetchLeads}
          onClose={() => setShowImport(false)}
        />
      )}

      <div className="container-fluid py-4 px-4">
        <div className="d-flex justify-content-between align-items-center mb-4">
          <div>
            <h4 className="fw-bold mb-0">Leads</h4>
            <span className="text-muted small">{pagination.total.toLocaleString()} total</span>
          </div>
          <button className="btn btn-primary" onClick={() => setShowImport(true)}>
            + Import leads
          </button>
        </div>

        <div className="row g-2 mb-3">
          <div className="col-md-5">
            <input type="search" className="form-control"
              placeholder="Search by name, email, or company…"
              value={search} onChange={(e) => handleSearchChange(e.target.value)} />
          </div>
          <div className="col-md-3">
            <select className="form-select" value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}>
              <option value="">All statuses</option>
              <option value="active">Active</option>
              <option value="unsubscribed">Unsubscribed</option>
              <option value="bounced">Bounced</option>
            </select>
          </div>
          {selected.size > 0 && (
            <div className="col-auto ms-auto">
              <button className="btn btn-outline-danger" onClick={handleBulkDelete}>
                Delete {selected.size} selected
              </button>
            </div>
          )}
        </div>

        {deleteError && <div className="alert alert-danger py-2">{deleteError}</div>}

        <div className="table-responsive rounded border">
          <table className="table table-hover align-middle mb-0">
            <thead className="table-light">
              <tr>
                <th style={{ width: 40 }}>
                  <input type="checkbox" className="form-check-input"
                    checked={leads.length > 0 && selected.size === leads.length}
                    onChange={toggleAll} />
                </th>
                <th>Email</th>
                <th>Name</th>
                <th>Company</th>
                <th>Status</th>
                <th>Imported</th>
                <th style={{ width: 60 }}></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="text-center py-5 text-muted">
                  <div className="spinner-border spinner-border-sm me-2" />Loading…
                </td></tr>
              ) : leads.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-5 text-muted">
                  {search || statusFilter
                    ? 'No leads match your filters.'
                    : 'No leads yet. Import a spreadsheet to get started.'}
                </td></tr>
              ) : leads.map((lead) => (
                <tr key={lead._id} className={selected.has(lead._id) ? 'table-active' : ''}>
                  <td>
                    <input type="checkbox" className="form-check-input"
                      checked={selected.has(lead._id)}
                      onChange={() => toggleSelect(lead._id)} />
                  </td>
                  <td className="fw-medium">{lead.email}</td>
                  <td className="text-muted">{lead.name || '—'}</td>
                  <td className="text-muted">{lead.company || '—'}</td>
                  <td><Badge status={lead.status} /></td>
                  <td className="text-muted small">
                    {new Date(lead.createdAt).toLocaleDateString()}
                  </td>
                  <td>
                    <button className="btn btn-sm btn-link text-danger p-0"
                      onClick={() => handleDelete(lead._id)} title="Delete">✕</button>
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
                <button className="page-link" onClick={() => setPage(page - 1)}>‹ Prev</button>
              </li>
              {Array.from({ length: pagination.pages }, (_, i) => i + 1)
                .filter((p) => p === 1 || p === pagination.pages || Math.abs(p - page) <= 2)
                .reduce((acc, p, idx, arr) => {
                  if (idx > 0 && p - arr[idx - 1] > 1) acc.push('…');
                  acc.push(p);
                  return acc;
                }, [])
                .map((p, i) =>
                  p === '…'
                    ? <li key={`e-${i}`} className="page-item disabled"><span className="page-link">…</span></li>
                    : <li key={p} className={`page-item ${p === page ? 'active' : ''}`}>
                        <button className="page-link" onClick={() => setPage(p)}>{p}</button>
                      </li>
                )}
              <li className={`page-item ${page === pagination.pages ? 'disabled' : ''}`}>
                <button className="page-link" onClick={() => setPage(page + 1)}>Next ›</button>
              </li>
            </ul>
          </nav>
        )}
      </div>
    </>
  );
}