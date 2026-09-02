import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';

export default function Dashboard() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    Promise.all([
      api.get('/leads', { params: { limit: 1 } }),
      api.get('/campaigns', { params: { limit: 1 } }),
    ])
      .then(([leadsRes, campaignsRes]) => {
        const campaigns = campaignsRes.data.campaigns ?? [];
        const totalSent = campaigns.reduce((sum, c) => sum + (c.stats?.sent ?? 0), 0);
        setStats({
          totalLeads: leadsRes.data.pagination.total,
          totalCampaigns: campaignsRes.data.pagination.total,
          totalEmailsSent: totalSent,
        });
      })
      .catch(() => {});
  }, []);

  return (
    <div className="container-fluid py-4 px-4">
      <h4 className="fw-bold mb-4">Dashboard</h4>

      <div className="row g-3 mb-4">
        {/* Leads card */}
        <div className="col-sm-6 col-lg-3">
          <div className="card h-100 border-0 shadow-sm">
            <div className="card-body">
              <p className="text-muted small mb-1">Total leads</p>
              <h2 className="fw-bold mb-0">
                {stats ? stats.totalLeads.toLocaleString() : '—'}
              </h2>
            </div>
            <div className="card-footer bg-transparent border-0 pt-0">
              <Link to="/leads" className="btn btn-sm btn-outline-primary">
                View leads →
              </Link>
            </div>
          </div>
        </div>

        {/* Campaigns card */}
        <div className="col-sm-6 col-lg-3">
          <div className="card h-100 border-0 shadow-sm">
            <div className="card-body">
              <p className="text-muted small mb-1">Campaigns sent</p>
              <h2 className="fw-bold mb-0">
                {stats ? stats.totalCampaigns.toLocaleString() : '—'}
              </h2>
            </div>
            <div className="card-footer bg-transparent border-0 pt-0">
              <Link to="/campaigns" className="btn btn-sm btn-outline-primary">
                View campaigns →
              </Link>
            </div>
          </div>
        </div>

        {/* Emails delivered */}
        <div className="col-sm-6 col-lg-3">
          <div className="card h-100 border-0 shadow-sm">
            <div className="card-body">
              <p className="text-muted small mb-1">Emails delivered</p>
              <h2 className="fw-bold mb-0">
                {stats ? stats.totalEmailsSent.toLocaleString() : '—'}
              </h2>
            </div>
            <div className="card-footer bg-transparent border-0 pt-0">
              <Link to="/campaigns" className="btn btn-sm btn-outline-primary">
                View campaigns →
              </Link>
            </div>
          </div>
        </div>

        {/* Placeholder */}
        <div className="col-sm-6 col-lg-3">
          <div className="card h-100 border-0 shadow-sm">
            <div className="card-body">
              <p className="text-muted small mb-1">Open rate</p>
              <h2 className="fw-bold mb-0 text-muted">—</h2>
            </div>
            <div className="card-footer bg-transparent border-0 pt-0">
              <span className="badge bg-light text-muted border">Coming soon</span>
            </div>
          </div>
        </div>
      </div>

      <div className="alert alert-success">
        <strong>Email blasting is live.</strong> Import leads via the{' '}
        <Link to="/leads">Leads</Link> page, then fire a campaign from{' '}
        <Link to="/campaigns">Campaigns</Link>.
      </div>
    </div>
  );
}