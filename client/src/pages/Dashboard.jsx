import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLinks } from '../hooks/useLinks'
import { useDashboard } from '../hooks/useDashboard'
import LinkForm from '../components/LinkForm'
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, PointElement, LineElement,
  ArcElement, Tooltip, Legend, Filler
} from 'chart.js'
import { Line, Doughnut } from 'react-chartjs-2'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, ArcElement, Tooltip, Legend, Filler)

function StatCard({ label, value, sub, subColor }) {
  return (
    <div className="stat-card">
      <span className="stat-card-label">{label}</span>
      <span className="stat-card-value">{value ?? '—'}</span>
      {sub && <span className="stat-card-sub" style={{ color: subColor || '#6b7280' }}>{sub}</span>}
    </div>
  )
}

export default function Dashboard() {
  const { links, loading: linksLoading, error: linksError, createLink, deleteLink } = useLinks()
  const { data, loading: statsLoading, error: statsError, refetch } = useDashboard()
  const navigate = useNavigate()
  const [copied, setCopied] = useState(null)

  async function handleCreate(url, customSlug) {
    await createLink(url, customSlug)
    refetch() // refresh overview stats after new link
  }

  async function handleCopy(e, shortUrl, id) {
    e.stopPropagation()
    await navigator.clipboard.writeText(shortUrl)
    setCopied(id)
    setTimeout(() => setCopied(null), 2000)
  }

  async function handleDelete(e, id) {
    e.stopPropagation()
    if (confirm('Delete this link?')) {
      await deleteLink(id)
      refetch()
    }
  }

  // Line chart — clicks by day from server
  const lineData = data ? {
    labels: Object.keys(data.clicksByDay),
    datasets: [{
      data: Object.values(data.clicksByDay),
      fill: true,
      borderColor: '#6366f1',
      backgroundColor: 'rgba(99,102,241,0.08)',
      tension: 0.45,
      pointRadius: 4,
      pointBackgroundColor: '#6366f1',
      pointBorderColor: '#fff',
      pointBorderWidth: 2,
    }]
  } : null

  const lineOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false }, tooltip: { mode: 'index', intersect: false } },
    scales: {
      x: { grid: { display: false }, ticks: { color: '#9ca3af', font: { size: 12 } } },
      y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.04)' }, ticks: { color: '#9ca3af', font: { size: 12 } } }
    }
  }

  // Doughnut — device split from server
  const doughnutData = data ? {
    labels: Object.keys(data.byDevice),
    datasets: [{
      data: Object.values(data.byDevice),
      backgroundColor: ['#6366f1', '#10b981', '#f59e0b', '#f87171'],
      borderColor: '#ffffff',
      borderWidth: 3,
      hoverOffset: 4,
    }]
  } : null

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '75%',
    spacing: 4,
    plugins: {
      legend: {
        position: 'bottom',
        labels: { color: '#6b7280', font: { size: 12 }, padding: 16, usePointStyle: true, pointStyleWidth: 8 }
      }
    }
  }

  const maxReferrer = data ? Math.max(...Object.values(data.byReferrer), 1) : 1

  return (
    <div className="db-page">
      {/* Header */}
      <div className="db-header">
        <h2 className="db-title">Analytics dashboard</h2>
        <span className="db-range-badge">Last 30 days</span>
      </div>

      {statsError && <p className="form-error" style={{ marginBottom: '1rem' }}>{statsError}</p>}

      {/* Stat cards */}
      <div className="db-stat-grid">
        <StatCard
          label="Total clicks"
          value={data ? data.totalClicks.toLocaleString() : '—'}
        />
        <StatCard
          label="Active links"
          value={data ? data.activeLinks : '—'}
        />
        <StatCard
          label="Unique visitors"
          value={data ? data.uniqueVisitors.toLocaleString() : '—'}
        />
        <StatCard
          label="Top country"
          value={data?.topCountry ? data.topCountry.name : '—'}
          sub={data?.topCountry ? `${data.topCountry.pct}% of traffic` : null}
          subColor="#6b7280"
        />
      </div>

      {/* Charts row */}
      <div className="db-charts-row">
        <div className="db-chart-card db-chart-main">
          <h3 className="db-chart-title">Clicks over time (last 7 days)</h3>
          <div style={{ height: 220 }}>
            {statsLoading && <p className="db-muted">Loading chart…</p>}
            {lineData && <Line data={lineData} options={lineOptions} />}
            {!statsLoading && !lineData && <p className="db-muted">No data yet.</p>}
          </div>
        </div>
        <div className="db-chart-card db-chart-side">
          <h3 className="db-chart-title">Traffic by device</h3>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
            {statsLoading && <p className="db-muted">Loading…</p>}
            {doughnutData && Object.keys(data.byDevice).length > 0
              ? <div className="doughnut-wrap"><Doughnut data={doughnutData} options={doughnutOptions} /></div>
              : !statsLoading && <p className="db-muted">No data yet.</p>
            }
          </div>
        </div>
      </div>

      {/* Referrers */}
      <div className="db-card">
        <h3 className="db-chart-title">Top referrers</h3>
        {statsLoading && <p className="db-muted">Loading…</p>}
        {data && Object.keys(data.byReferrer).length === 0 && (
          <p className="db-muted">No referrer data yet.</p>
        )}
        {data && Object.keys(data.byReferrer).length > 0 && (
          <div className="db-referrers">
            {Object.entries(data.byReferrer).map(([source, clicks]) => (
              <div key={source} className="db-referrer-row">
                <span className="db-referrer-source">{source}</span>
                <div className="db-referrer-bar-wrap">
                  <div className="db-referrer-bar" style={{ width: `${(clicks / maxReferrer) * 100}%` }} />
                </div>
                <span className="db-referrer-count">{clicks.toLocaleString()}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Shorten form */}
      <div className="db-card">
        <h3 className="db-chart-title" style={{ marginBottom: '1rem' }}>Shorten a new URL</h3>
        <LinkForm onCreate={handleCreate} />
      </div>

      {/* Links table */}
      <div className="db-card">
        <h3 className="db-chart-title">Your links</h3>
        {linksLoading && <p className="db-muted">Loading…</p>}
        {linksError && <p style={{ color: '#ef4444', fontSize: '0.85rem' }}>{linksError}</p>}
        {!linksLoading && links.length === 0 && (
          <p className="db-muted" style={{ padding: '1.5rem 0' }}>No links yet. Shorten your first URL above.</p>
        )}
        {!linksLoading && links.length > 0 && (
          <table className="db-table">
            <thead>
              <tr>
                <th>Short URL</th>
                <th>Destination</th>
                <th>Clicks</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {links.map((link) => (
                <tr key={link.id} className="db-table-row" onClick={() => navigate(`/links/${link.id}`)}>
                  <td>
                    <a href={link.shortUrl} target="_blank" rel="noopener noreferrer"
                      className="db-link" onClick={e => e.stopPropagation()}>
                      {link.shortUrl.replace(/^https?:\/\//, '')}
                    </a>
                  </td>
                  <td className="db-muted-cell">{link.originalUrl.replace(/^https?:\/\//, '').slice(0, 45)}</td>
                  <td style={{ fontWeight: 600 }}>{(link.clicks || 0).toLocaleString()}</td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.4rem' }}>
                      <button className="db-btn-ghost" onClick={e => handleCopy(e, link.shortUrl, link.id)}>
                        {copied === link.id ? '✓' : 'Copy'}
                      </button>
                      <button className="db-btn-danger" onClick={e => handleDelete(e, link.id)}>Del</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}