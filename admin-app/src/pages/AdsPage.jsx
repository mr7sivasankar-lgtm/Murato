import { useState, useEffect } from 'react';
import { Search, Trash2, Star, CheckCircle, XCircle, Flag } from 'lucide-react';
import api from '../api/axios';
import toast from 'react-hot-toast';

const STATUS_TABS = ['all', 'active', 'pending', 'rejected'];

export default function AdsPage() {
  const [ads, setAds] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => { fetchAds(); }, [status, page]);

  const fetchAds = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/admin/ads', { params: { q, status, page, limit: 15 } });
      setAds(data.ads);
      setTotal(data.total);
    } catch { setAds([]); }
    finally { setLoading(false); }
  };

  const updateStatus = async (ad, newStatus) => {
    try {
      await api.put(`/admin/ads/${ad._id}/status`, { status: newStatus });
      setAds(prev => prev.map(a => a._id === ad._id ? { ...a, status: newStatus } : a));
      toast.success(`Ad ${newStatus}`);
    } catch { toast.error('Failed'); }
  };

  const toggleFeatured = async (ad) => {
    try {
      await api.put(`/admin/ads/${ad._id}/status`, { isFeatured: !ad.isFeatured });
      setAds(prev => prev.map(a => a._id === ad._id ? { ...a, isFeatured: !a.isFeatured } : a));
      toast.success(ad.isFeatured ? 'Removed from featured' : '⭐ Marked as featured');
    } catch {}
  };

  const deleteAd = async (id) => {
    if (!confirm('Delete this ad permanently?')) return;
    try {
      await api.delete(`/admin/ads/${id}`);
      setAds(prev => prev.filter(a => a._id !== id));
      toast.success('Ad deleted');
    } catch {}
  };

  const pages = Math.ceil(total / 15);

  return (
    <div>
      <div className="topbar">
        <h2>📋 Ads Management</h2>
        <span style={{ fontSize: 14, color: 'var(--text-secondary)' }}>{total} total ads</span>
      </div>

      {/* Status Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {STATUS_TABS.map(t => (
          <button key={t} onClick={() => { setStatus(t === 'all' ? '' : t); setPage(1); }}
            className="btn" style={{ background: (status || 'all') === t ? 'var(--navy)' : 'var(--white)', color: (status || 'all') === t ? 'white' : 'var(--text-primary)', border: '1.5px solid var(--border)' }}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      <div className="table-wrap">
        <div className="table-header">
          <h3>Listings</h3>
          <div style={{ display: 'flex', gap: 10 }}>
            <div className="search-input">
              <Search size={15} color="var(--text-muted)" />
              <input placeholder="Search ads..." value={q} onChange={e => setQ(e.target.value)} onKeyDown={e => e.key === 'Enter' && fetchAds()} />
            </div>
            <button className="btn btn-primary btn-sm" onClick={fetchAds}>Search</button>
          </div>
        </div>

        {loading ? <div className="spinner" /> : (
          <table>
            <thead>
              <tr>
                <th>Ad</th>
                <th>Price</th>
                <th>Category</th>
                <th>Seller</th>
                <th>Status</th>
                <th>Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {ads.map(ad => (
                <tr key={ad._id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      {ad.images?.[0] ? <img src={ad.images[0]} style={{ width: 48, height: 48, borderRadius: 8, objectFit: 'cover' }} /> : <div style={{ width: 48, height: 48, borderRadius: 8, background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>🏗️</div>}
                      <div>
                        <p style={{ fontWeight: 600, maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ad.title}</p>
                        <p style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{ad.type} {ad.isFeatured ? '⭐' : ''} {ad.isFlagged ? '🚩' : ''}</p>
                      </div>
                    </div>
                  </td>
                  <td style={{ fontWeight: 700 }}>₹{Number(ad.price).toLocaleString('en-IN')}</td>
                  <td><span className="badge badge-approved">{ad.category}</span></td>
                  <td>{ad.userId?.name}</td>
                  <td><span className={`badge badge-${ad.status}`}>{ad.status}</span></td>
                  <td>{new Date(ad.createdAt).toLocaleDateString('en-IN')}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button className={`btn btn-sm ${ad.isFeatured ? 'btn-warning' : 'btn-ghost'}`} onClick={() => toggleFeatured(ad)} title="Featured">
                        <Star size={12} />
                      </button>
                      {ad.status !== 'active' && <button className="btn btn-success btn-sm" onClick={() => updateStatus(ad, 'active')}><CheckCircle size={12} /> Approve</button>}
                      {ad.status !== 'rejected' && <button className="btn btn-warning btn-sm" onClick={() => updateStatus(ad, 'rejected')}><XCircle size={12} /></button>}
                      <button className="btn btn-danger btn-sm" onClick={() => deleteAd(ad._id)}><Trash2 size={12} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {pages > 1 && (
          <div className="pagination">
            {Array.from({ length: pages }, (_, i) => i + 1).map(p => (
              <button key={p} className={`page-btn ${page === p ? 'active' : ''}`} onClick={() => setPage(p)}>{p}</button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
