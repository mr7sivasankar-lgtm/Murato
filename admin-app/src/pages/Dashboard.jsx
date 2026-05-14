import { useState, useEffect } from 'react';
import { Users, FileText, Store, MessageCircle, AlertTriangle, Clock } from 'lucide-react';
import api from '../api/axios';

const KPI = ({ icon, label, value, bg }) => (
  <div className="kpi-card">
    <div className="kpi-icon" style={{ background: bg }}>{icon}</div>
    <div>
      <div className="kpi-num">{value ?? '—'}</div>
      <div className="kpi-label">{label}</div>
    </div>
  </div>
);

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/admin/stats')
      .then(r => setStats(r.data))
      .catch(() => setStats({}))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <div className="topbar">
        <h2>📊 Dashboard</h2>
        <span className="admin-badge">🏠 Myillo Admin</span>
      </div>

      {loading ? <div className="spinner" /> : (
        <div className="kpi-grid">
          <KPI icon={<Users size={24} />} label="Total Users" value={stats?.users} bg="#dbeafe" />
          <KPI icon={<FileText size={24} />} label="Active Ads" value={stats?.ads} bg="#dcfce7" />
          <KPI icon={<Store size={24} />} label="Approved Shops" value={stats?.shops} bg="#fef3c7" />
          <KPI icon={<MessageCircle size={24} />} label="Total Chats" value={stats?.chats} bg="#f3e8ff" />
          <KPI icon={<AlertTriangle size={24} />} label="Flagged Ads" value={stats?.flaggedAds} bg="#fee2e2" />
          <KPI icon={<Clock size={24} />} label="Pending Shops" value={stats?.pendingShops} bg="#fff7ed" />
        </div>
      )}

      <div className="table-wrap" style={{ padding: 24 }}>
        <h3 style={{ marginBottom: 12 }}>Quick Actions</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          {[
            { emoji: '🔍', label: 'Review Flagged Ads', desc: `${stats?.flaggedAds || 0} ads need review`, color: '#fee2e2' },
            { emoji: '🏪', label: 'Approve Shops', desc: `${stats?.pendingShops || 0} shops pending`, color: '#fff7ed' },
            { emoji: '📦', label: 'Manage Ads', desc: `${stats?.ads || 0} active listings`, color: '#dcfce7' },
          ].map(q => (
            <div key={q.label} style={{ background: q.color, borderRadius: 12, padding: 16, cursor: 'pointer' }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>{q.emoji}</div>
              <p style={{ fontWeight: 700, fontSize: 14 }}>{q.label}</p>
              <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>{q.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
