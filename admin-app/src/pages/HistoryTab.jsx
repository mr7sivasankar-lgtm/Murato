import { useState, useEffect } from 'react';
import { Trash2, User, FileText, Clock } from 'lucide-react';
import api from '../api/axios';
import toast from 'react-hot-toast';

const TYPE_TABS = ['all', 'user', 'ad'];

export default function HistoryTab() {
  const [records, setRecords] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [type, setType] = useState('all');
  const [page, setPage] = useState(1);

  useEffect(() => { fetchHistory(); }, [type, page]);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/admin/history', { params: { type, page, limit: 15 } });
      setRecords(data.records); setTotal(data.total);
    } catch { toast.error('Failed to load history'); setRecords([]); }
    finally { setLoading(false); }
  };

  const pages = Math.ceil(total / 15);

  const timeAgo = (date) => {
    const s = Math.floor((Date.now() - new Date(date)) / 1000);
    if (s < 60) return 'Just now';
    if (s < 3600) return `${Math.floor(s / 60)}m ago`;
    if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
    return `${Math.floor(s / 86400)}d ago`;
  };

  return (
    <div>
      {/* Stats bar */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 24 }}>
        {[
          { label: 'Total Deleted', value: total, color: '#f1f5f9', tc: '#475569', icon: '🗑️' },
          { label: 'Deleted Users', value: records.filter(r => r.type === 'user').length, color: '#fff1f2', tc: '#b91c1c', icon: '👤' },
          { label: 'Deleted Ads', value: records.filter(r => r.type === 'ad').length, color: '#fffbeb', tc: '#92400e', icon: '📋' },
        ].map(s => (
          <div key={s.label} style={{ flex: 1, background: s.color, borderRadius: 14, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
            <span style={{ fontSize: 26 }}>{s.icon}</span>
            <div>
              <div style={{ fontSize: 26, fontWeight: 900, color: s.tc, lineHeight: 1 }}>{s.value}</div>
              <div style={{ fontSize: 12, fontWeight: 600, color: s.tc, marginTop: 3 }}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Type tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {TYPE_TABS.map(t => (
          <button key={t} onClick={() => { setType(t); setPage(1); }}
            style={{
              padding: '8px 20px', borderRadius: 10, fontWeight: 700, fontSize: 13, cursor: 'pointer', border: 'none',
              background: type === t ? 'var(--navy)' : 'white',
              color: type === t ? 'white' : 'var(--text-secondary)',
              boxShadow: type === t ? '0 3px 10px rgba(30,58,95,0.25)' : '0 1px 4px rgba(0,0,0,0.08)',
              transition: 'all 0.2s',
            }}>
            {t === 'all' ? '📋 All' : t === 'user' ? '👤 Users' : '🗂️ Ads'}
          </button>
        ))}
      </div>

      {loading ? <div className="spinner" /> : records.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--text-secondary)' }}>
          <p style={{ fontSize: 48, marginBottom: 12 }}>📂</p>
          <p style={{ fontWeight: 700, fontSize: 16 }}>No deletion history yet</p>
          <p style={{ fontSize: 14, marginTop: 6 }}>Deleted users and ads will appear here.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {records.map((r, i) => (
            <div key={r._id || i} style={{
              background: 'white',
              borderRadius: 14,
              padding: '16px 20px',
              boxShadow: 'var(--shadow)',
              display: 'flex',
              alignItems: 'center',
              gap: 16,
              border: `1px solid ${r.type === 'user' ? '#fecaca' : '#fed7aa'}`,
              transition: 'transform 0.15s',
            }}
              onMouseEnter={e => e.currentTarget.style.transform = 'translateX(4px)'}
              onMouseLeave={e => e.currentTarget.style.transform = 'translateX(0)'}
            >
              {/* Icon */}
              <div style={{
                width: 46, height: 46, borderRadius: 13, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20,
                background: r.type === 'user' ? '#fee2e2' : '#fff7ed',
              }}>
                {r.type === 'user' ? '👤' : '📋'}
              </div>

              {/* Image for ads */}
              {r.type === 'ad' && r.imageUrl && (
                <img src={r.imageUrl} alt="" style={{ width: 52, height: 52, borderRadius: 10, objectFit: 'cover', flexShrink: 0 }} />
              )}

              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span style={{
                    fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20,
                    background: r.type === 'user' ? '#fee2e2' : '#fff7ed',
                    color: r.type === 'user' ? '#b91c1c' : '#92400e',
                  }}>
                    {r.type === 'user' ? 'USER' : 'AD'}
                  </span>
                  <h4 style={{ fontWeight: 700, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {r.type === 'user' ? r.name : r.title}
                  </h4>
                </div>
                <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                  {r.type === 'user' && (
                    <>
                      <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>📞 {r.phone}</span>
                      {r.city && <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>📍 {r.city}</span>}
                    </>
                  )}
                  {r.type === 'ad' && (
                    <>
                      {r.price > 0 && <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--navy)' }}>₹{r.price?.toLocaleString('en-IN')}</span>}
                      {r.category && <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>🏷️ {r.category}</span>}
                      {r.sellerName && <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>👤 {r.sellerName}</span>}
                    </>
                  )}
                </div>
              </div>

              {/* Time */}
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--text-muted)', fontSize: 12, marginBottom: 4 }}>
                  <Clock size={12} /> {timeAgo(r.deletedAt)}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                  {new Date(r.deletedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {pages > 1 && (
        <div className="pagination" style={{ marginTop: 20 }}>
          {Array.from({ length: pages }, (_, i) => i + 1).map(p => (
            <button key={p} className={`page-btn ${page === p ? 'active' : ''}`} onClick={() => setPage(p)}>{p}</button>
          ))}
        </div>
      )}
    </div>
  );
}
