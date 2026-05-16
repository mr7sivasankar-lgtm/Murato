import { useState, useEffect } from 'react';
import { Search, Trash2, Star, CheckCircle, XCircle, Flag, X, MapPin, Eye, Phone } from 'lucide-react';
import api from '../api/axios';
import toast from 'react-hot-toast';
import ConfirmModal from '../components/ConfirmModal';

const STATUS_TABS = ['all', 'active', 'pending', 'rejected'];

export default function AdsPage() {
  const [ads, setAds] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [selectedAds, setSelectedAds] = useState([]);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [selectedAdDetails, setSelectedAdDetails] = useState(null);

  useEffect(() => { fetchAds(); }, [status, page]);

  const fetchAds = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/admin/ads', { params: { q, status, page, limit: 15 } });
      setAds(data.ads);
      setTotal(data.total);
      setSelectedAds([]);
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

  const deleteAd = async () => {
    try {
      await api.delete(`/admin/ads/${deleteTarget}`);
      setAds(prev => prev.filter(a => a._id !== deleteTarget));
      setSelectedAds(prev => prev.filter(id => id !== deleteTarget));
      if (selectedAdDetails?._id === deleteTarget) setSelectedAdDetails(null);
      toast.success('Ad deleted');
    } catch {}
    finally { setDeleteTarget(null); }
  };

  const handleBulkAction = async (action) => {
    if (selectedAds.length === 0) return;
    if (!window.confirm(`Are you sure you want to ${action} ${selectedAds.length} ads?`)) return;
    setBulkLoading(true);
    try {
      await api.post('/admin/ads/bulk-action', { adIds: selectedAds, action });
      toast.success(`Successfully applied ${action} to ${selectedAds.length} ads`);
      fetchAds();
    } catch {
      toast.error('Bulk action failed');
    } finally {
      setBulkLoading(false);
    }
  };

  const toggleSelectAll = () => {
    if (selectedAds.length === ads.length) setSelectedAds([]);
    else setSelectedAds(ads.map(a => a._id));
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
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <h3 style={{ margin: 0 }}>Listings</h3>
            {selectedAds.length > 0 && (
              <div style={{ display: 'flex', gap: 8, background: 'var(--bg)', padding: '4px 12px', borderRadius: 8, alignItems: 'center' }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>{selectedAds.length} selected</span>
                <button className="btn btn-success btn-sm" onClick={() => handleBulkAction('active')} disabled={bulkLoading}>Approve</button>
                <button className="btn btn-warning btn-sm" onClick={() => handleBulkAction('rejected')} disabled={bulkLoading}>Reject</button>
                <button className="btn btn-danger btn-sm" onClick={() => handleBulkAction('delete')} disabled={bulkLoading}>Delete</button>
              </div>
            )}
          </div>
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
                <th style={{ width: 40 }}><input type="checkbox" checked={ads.length > 0 && selectedAds.length === ads.length} onChange={toggleSelectAll} /></th>
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
                <tr key={ad._id} onClick={() => setSelectedAdDetails(ad)} style={{ cursor: 'pointer' }}>
                  <td onClick={e => e.stopPropagation()}>
                    <input 
                      type="checkbox" 
                      checked={selectedAds.includes(ad._id)} 
                      onChange={() => setSelectedAds(prev => prev.includes(ad._id) ? prev.filter(id => id !== ad._id) : [...prev, ad._id])} 
                    />
                  </td>
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
                  <td onClick={e => e.stopPropagation()}>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button className={`btn btn-sm ${ad.isFeatured ? 'btn-warning' : 'btn-ghost'}`} onClick={() => toggleFeatured(ad)} title="Featured">
                        <Star size={12} />
                      </button>
                      {ad.status !== 'active' && <button className="btn btn-success btn-sm" onClick={() => updateStatus(ad, 'active')} title="Approve"><CheckCircle size={12} /></button>}
                      {ad.status !== 'rejected' && <button className="btn btn-warning btn-sm" onClick={() => updateStatus(ad, 'rejected')} title="Reject"><XCircle size={12} /></button>}
                      <button className="btn btn-danger btn-sm" onClick={() => setDeleteTarget(ad._id)} title="Delete"><Trash2 size={12} /></button>
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

      {/* Ad Details Modal */}
      {selectedAdDetails && (
        <div className="modal-overlay" onClick={() => setSelectedAdDetails(null)}>
          <div className="modal" style={{ maxWidth: 700, width: '95%', maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 className="modal-title" style={{ margin: 0 }}>Ad Details</h2>
              <button onClick={() => setSelectedAdDetails(null)}><X size={20} color="var(--text-secondary)" /></button>
            </div>
            <div style={{ display: 'flex', gap: 20 }}>
              <div style={{ width: 250, flexShrink: 0 }}>
                {selectedAdDetails.images?.[0] ? (
                  <img src={selectedAdDetails.images[0]} style={{ width: '100%', height: 200, objectFit: 'cover', borderRadius: 12 }} />
                ) : (
                  <div style={{ width: '100%', height: 200, borderRadius: 12, background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40 }}>🏗️</div>
                )}
                <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
                  {selectedAdDetails.images?.slice(1).map((img, i) => (
                    <img key={i} src={img} style={{ width: 50, height: 50, borderRadius: 6, objectFit: 'cover' }} />
                  ))}
                </div>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                  <h3 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>{selectedAdDetails.title}</h3>
                  <span className={`badge badge-${selectedAdDetails.status}`}>{selectedAdDetails.status}</span>
                </div>
                <div style={{ fontSize: 24, fontWeight: 900, color: 'var(--navy)', marginBottom: 16 }}>
                  ₹{Number(selectedAdDetails.price).toLocaleString('en-IN')}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20, background: 'var(--bg)', padding: 16, borderRadius: 12 }}>
                  <div>
                    <p style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase' }}>Category</p>
                    <p style={{ fontWeight: 600 }}>{selectedAdDetails.category}</p>
                  </div>
                  <div>
                    <p style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase' }}>Type</p>
                    <p style={{ fontWeight: 600 }}>{selectedAdDetails.type}</p>
                  </div>
                  <div>
                    <p style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase' }}>Posted On</p>
                    <p style={{ fontWeight: 600 }}>{new Date(selectedAdDetails.createdAt).toLocaleDateString('en-IN')}</p>
                  </div>
                  <div>
                    <p style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase' }}>Views</p>
                    <p style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}><Eye size={14} /> {selectedAdDetails.views || 0}</p>
                  </div>
                </div>
                
                <h4 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12, borderBottom: '1px solid var(--border)', paddingBottom: 8 }}>Seller Info</h4>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                  <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'linear-gradient(135deg,#1e3a5f,#2a5298)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 16 }}>
                    {selectedAdDetails.userId?.name?.[0]?.toUpperCase() || '?'}
                  </div>
                  <div>
                    <p style={{ fontWeight: 700, fontSize: 15 }}>{selectedAdDetails.userId?.name}</p>
                    <p style={{ fontSize: 13, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Phone size={12} /> {selectedAdDetails.userId?.phone}
                    </p>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6, color: 'var(--text-secondary)', fontSize: 13 }}>
                  <MapPin size={14} style={{ marginTop: 2, flexShrink: 0 }} />
                  <p style={{ margin: 0 }}>
                    {selectedAdDetails.location?.area ? `${selectedAdDetails.location.area}, ` : ''}{selectedAdDetails.location?.city}
                  </p>
                </div>

                <div style={{ display: 'flex', gap: 8, marginTop: 24 }}>
                  <button className="btn btn-danger" onClick={() => { setDeleteTarget(selectedAdDetails._id); setSelectedAdDetails(null); }}>
                    <Trash2 size={16} /> Delete Ad
                  </button>
                  {selectedAdDetails.status !== 'active' && (
                    <button className="btn btn-success" onClick={() => { updateStatus(selectedAdDetails, 'active'); setSelectedAdDetails(null); }}>
                      <CheckCircle size={16} /> Approve Ad
                    </button>
                  )}
                  {selectedAdDetails.status !== 'rejected' && (
                    <button className="btn btn-warning" onClick={() => { updateStatus(selectedAdDetails, 'rejected'); setSelectedAdDetails(null); }}>
                      <XCircle size={16} /> Reject Ad
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {deleteTarget && (
        <ConfirmModal
          title="Delete Ad?"
          message="This ad will be permanently deleted and cannot be recovered."
          onConfirm={deleteAd}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}
