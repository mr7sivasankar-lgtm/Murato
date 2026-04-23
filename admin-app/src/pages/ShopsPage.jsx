import { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Trash2, Eye } from 'lucide-react';
import api from '../api/axios';
import toast from 'react-hot-toast';

export default function ShopsPage() {
  const [shops, setShops] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('pending');

  useEffect(() => { fetchShops(); }, [status]);

  const fetchShops = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/admin/shops', { params: { status: status === 'all' ? '' : status } });
      setShops(data.shops);
      setTotal(data.total);
    } catch { setShops([]); }
    finally { setLoading(false); }
  };

  const updateStatus = async (shop, newStatus) => {
    try {
      await api.put(`/admin/shops/${shop._id}/status`, { status: newStatus });
      setShops(prev => prev.map(s => s._id === shop._id ? { ...s, status: newStatus } : s));
      toast.success(`Shop ${newStatus}`);
    } catch { toast.error('Failed'); }
  };

  const deleteShop = async (id) => {
    if (!confirm('Delete this shop?')) return;
    try {
      await api.delete(`/admin/shops/${id}`);
      setShops(prev => prev.filter(s => s._id !== id));
      toast.success('Shop deleted');
    } catch {}
  };

  return (
    <div>
      <div className="topbar">
        <h2>🏪 Shops</h2>
        <span style={{ fontSize: 14, color: 'var(--text-secondary)' }}>{total} shops</span>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {['pending', 'approved', 'rejected', 'all'].map(t => (
          <button key={t} onClick={() => setStatus(t)}
            className="btn" style={{ background: status === t ? 'var(--navy)' : 'var(--white)', color: status === t ? 'white' : 'var(--text-primary)', border: '1.5px solid var(--border)' }}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      <div className="table-wrap">
        <div className="table-header"><h3>Shop Applications</h3></div>
        {loading ? <div className="spinner" /> : shops.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-secondary)' }}>No shops found</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Shop</th>
                <th>Owner</th>
                <th>Location</th>
                <th>Status</th>
                <th>Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {shops.map(shop => (
                <tr key={shop._id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      {shop.logo ? <img src={shop.logo} style={{ width: 44, height: 44, borderRadius: 10, objectFit: 'cover' }} /> :
                        <div style={{ width: 44, height: 44, borderRadius: 10, background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>🏪</div>}
                      <div>
                        <p style={{ fontWeight: 700 }}>{shop.name}</p>
                        <p style={{ fontSize: 12, color: 'var(--text-secondary)', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{shop.description || 'No description'}</p>
                      </div>
                    </div>
                  </td>
                  <td>{shop.ownerId?.name}<br /><span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{shop.ownerId?.phone}</span></td>
                  <td>{shop.location?.city}{shop.location?.area ? `, ${shop.location.area}` : ''}</td>
                  <td><span className={`badge badge-${shop.status}`}>{shop.status}</span></td>
                  <td>{new Date(shop.createdAt).toLocaleDateString('en-IN')}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 4 }}>
                      {shop.status !== 'approved' && (
                        <button className="btn btn-success btn-sm" onClick={() => updateStatus(shop, 'approved')}>
                          <CheckCircle size={12} /> Approve
                        </button>
                      )}
                      {shop.status !== 'rejected' && (
                        <button className="btn btn-warning btn-sm" onClick={() => updateStatus(shop, 'rejected')}>
                          <XCircle size={12} /> Reject
                        </button>
                      )}
                      <button className="btn btn-danger btn-sm" onClick={() => deleteShop(shop._id)}>
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
