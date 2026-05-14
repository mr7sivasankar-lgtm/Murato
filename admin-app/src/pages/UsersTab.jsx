import { useState, useEffect } from 'react';
import { Search, Ban, Trash2, CheckCircle, X, MapPin, Phone, MessageCircle } from 'lucide-react';
import api from '../api/axios';
import toast from 'react-hot-toast';
import ConfirmModal from '../components/ConfirmModal';

export default function UsersTab() {
  const [users, setUsers] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState(null);
  const [details, setDetails] = useState(null);
  const [userAds, setUserAds] = useState([]);
  const [dlLoading, setDlLoading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  useEffect(() => { fetchUsers(); }, [page]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/admin/users', { params: { q, page, limit: 15 } });
      setUsers(data.users); setTotal(data.total);
    } catch { setUsers([]); } finally { setLoading(false); }
  };

  const openDetails = async (id) => {
    setSelected(id); setDlLoading(true);
    try {
      const { data } = await api.get(`/admin/users/${id}/details`);
      setDetails(data.user); setUserAds(data.ads);
    } catch { toast.error('Failed'); setSelected(null); } finally { setDlLoading(false); }
  };

  const toggleBan = async (user, fromModal = false) => {
    try {
      await api.put(`/admin/users/${user._id}/ban`, { isBanned: !user.isBanned });
      setUsers(p => p.map(u => u._id === user._id ? { ...u, isBanned: !u.isBanned } : u));
      if (fromModal && details) setDetails(p => ({ ...p, isBanned: !p.isBanned }));
      toast.success(user.isBanned ? 'User unbanned' : 'User banned');
    } catch { toast.error('Failed'); }
  };

  const deleteUser = async () => {
    const { id, fromModal } = deleteTarget;
    try {
      await api.delete(`/admin/users/${id}`);
      setUsers(p => p.filter(u => u._id !== id));
      if (fromModal) setSelected(null);
      toast.success('User deleted');
    } catch { toast.error('Failed'); } finally { setDeleteTarget(null); }
  };

  const pages = Math.ceil(total / 15);
  const avatar = (u, size = 38) => u.avatar
    ? <img src={u.avatar} alt="" style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
    : <div style={{ width: size, height: size, borderRadius: '50%', background: 'linear-gradient(135deg,#1e3a5f,#2a5298)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: size * 0.38, flexShrink: 0 }}>{u.name?.[0]?.toUpperCase() || '?'}</div>;

  return (
    <div>
      {/* Stats strip */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 22 }}>
        {[
          { label: 'Total Users', value: total, color: '#dbeafe', tc: '#1d4ed8' },
          { label: 'Active', value: users.filter(u => !u.isBanned).length, color: '#dcfce7', tc: '#15803d' },
          { label: 'Banned', value: users.filter(u => u.isBanned).length, color: '#fee2e2', tc: '#b91c1c' },
        ].map(s => (
          <div key={s.label} style={{ background: s.color, borderRadius: 12, padding: '14px 22px', flex: 1 }}>
            <div style={{ fontSize: 26, fontWeight: 900, color: s.tc }}>{s.value}</div>
            <div style={{ fontSize: 12, color: s.tc, fontWeight: 600, marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div className="table-wrap">
        <div className="table-header">
          <h3>All Users</h3>
          <div style={{ display: 'flex', gap: 10 }}>
            <div className="search-input">
              <Search size={14} color="var(--text-muted)" />
              <input placeholder="Search name or phone…" value={q} onChange={e => setQ(e.target.value)} onKeyDown={e => e.key === 'Enter' && fetchUsers()} />
            </div>
            <button className="btn btn-primary btn-sm" onClick={fetchUsers}>Search</button>
          </div>
        </div>

        {loading ? <div className="spinner" /> : (
          <table>
            <thead><tr>
              <th>User</th><th>Phone</th><th>Location</th><th>Status</th><th>Joined</th><th>Actions</th>
            </tr></thead>
            <tbody>
              {users.map(u => (
                <tr key={u._id}>
                  <td onClick={() => openDetails(u._id)} style={{ cursor: 'pointer' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      {avatar(u)}
                      <div>
                        <p style={{ fontWeight: 700, color: 'var(--navy)' }}>{u.name}</p>
                        {u.businessName && <p style={{ fontSize: 11, color: 'var(--text-secondary)' }}>🏢 {u.businessName}</p>}
                      </div>
                    </div>
                  </td>
                  <td style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{u.phone}</td>
                  <td style={{ fontSize: 13 }}>{u.location?.city ? `${u.location.city}${u.location.area ? `, ${u.location.area}` : ''}` : '—'}</td>
                  <td><span className={`badge ${u.isBanned ? 'badge-banned' : 'badge-active'}`}>{u.isBanned ? 'Banned' : 'Active'}</span></td>
                  <td style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{new Date(u.createdAt).toLocaleDateString('en-IN')}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className={`btn btn-sm ${u.isBanned ? 'btn-success' : 'btn-warning'}`} onClick={() => toggleBan(u)}>
                        {u.isBanned ? <CheckCircle size={12} /> : <Ban size={12} />}
                        {u.isBanned ? 'Unban' : 'Ban'}
                      </button>
                      <button className="btn btn-danger btn-sm" onClick={() => setDeleteTarget({ id: u._id, fromModal: false })}><Trash2 size={12} /></button>
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

      {/* Detail Modal */}
      {selected && (
        <div className="modal-overlay" onClick={() => setSelected(null)}>
          <div className="modal" style={{ maxWidth: 820, width: '95%', maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 className="modal-title" style={{ margin: 0 }}>User Profile</h2>
              <button onClick={() => setSelected(null)}><X size={20} color="var(--text-secondary)" /></button>
            </div>
            {dlLoading || !details ? <div className="spinner" /> : (
              <div>
                <div style={{ display: 'flex', gap: 20, marginBottom: 24, padding: 20, background: 'var(--bg)', borderRadius: 14 }}>
                  {avatar(details, 80)}
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <h3 style={{ fontSize: 20, fontWeight: 800 }}>{details.name}</h3>
                        {details.businessName && <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>🏢 {details.businessName}</p>}
                        <div style={{ display: 'flex', gap: 16, marginTop: 10 }}>
                          <span style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 4 }}><Phone size={13} color="var(--text-secondary)" /> {details.phone}</span>
                          <span style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 4 }}><MapPin size={13} color="var(--text-secondary)" /> {details.location?.city || 'Not set'}</span>
                        </div>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end' }}>
                        <span className={`badge ${details.isBanned ? 'badge-banned' : 'badge-active'}`} style={{ fontSize: 13 }}>{details.isBanned ? 'Banned' : 'Active'}</span>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button className={`btn btn-sm ${details.isBanned ? 'btn-success' : 'btn-warning'}`} onClick={() => toggleBan(details, true)}>
                            {details.isBanned ? <CheckCircle size={13} /> : <Ban size={13} />} {details.isBanned ? 'Unban' : 'Ban'}
                          </button>
                          <button className="btn btn-danger btn-sm" onClick={() => setDeleteTarget({ id: details._id, fromModal: true })}><Trash2 size={13} /> Delete</button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12, borderBottom: '1px solid var(--border)', paddingBottom: 8 }}>Posted Ads ({userAds.length})</h3>
                {userAds.length === 0
                  ? <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '20px 0' }}>No ads posted yet.</p>
                  : <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(200px,1fr))', gap: 12 }}>
                    {userAds.map(ad => (
                      <div key={ad._id} style={{ border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
                        <div style={{ height: 110, background: '#f3f4f6' }}>
                          <img src={ad.images?.[0]} alt={ad.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        </div>
                        <div style={{ padding: '10px 12px' }}>
                          <p style={{ fontWeight: 600, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ad.title}</p>
                          <p style={{ fontWeight: 800, color: 'var(--navy)', fontSize: 14 }}>₹{ad.price?.toLocaleString('en-IN')}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                }
              </div>
            )}
          </div>
        </div>
      )}

      {deleteTarget && (
        <ConfirmModal
          title="Delete User?"
          message="This will permanently delete the user and all their ads. Cannot be undone."
          onConfirm={deleteUser}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}
