import { useState, useEffect } from 'react';
import { Search, Ban, Trash2, CheckCircle, X, MapPin, Phone, MessageCircle } from 'lucide-react';
import api from '../api/axios';
import toast from 'react-hot-toast';

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);

  // Modal state
  const [selectedUser, setSelectedUser] = useState(null);
  const [userDetails, setUserDetails] = useState(null);
  const [userAds, setUserAds] = useState([]);
  const [detailsLoading, setDetailsLoading] = useState(false);

  useEffect(() => { fetchUsers(); }, [page]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/admin/users', { params: { q, page, limit: 15 } });
      setUsers(data.users);
      setTotal(data.total);
    } catch { setUsers([]); }
    finally { setLoading(false); }
  };

  const fetchUserDetails = async (userId) => {
    setSelectedUser(userId);
    setDetailsLoading(true);
    try {
      const { data } = await api.get(`/admin/users/${userId}/details`);
      setUserDetails(data.user);
      setUserAds(data.ads);
    } catch {
      toast.error('Failed to load user details');
      setSelectedUser(null);
    } finally {
      setDetailsLoading(false);
    }
  };

  const toggleBan = async (user, fromModal = false) => {
    try {
      await api.put(`/admin/users/${user._id}/ban`, { isBanned: !user.isBanned });
      
      // Update table state
      setUsers(prev => prev.map(u => u._id === user._id ? { ...u, isBanned: !u.isBanned } : u));
      
      // Update modal state if open
      if (fromModal && userDetails) {
        setUserDetails(prev => ({ ...prev, isBanned: !prev.isBanned }));
      }

      toast.success(user.isBanned ? 'User unbanned' : 'User banned');
    } catch { toast.error('Failed'); }
  };

  const deleteUser = async (id, fromModal = false) => {
    if (!confirm('Delete this user permanently? This will also delete all their ads!')) return;
    try {
      await api.delete(`/admin/users/${id}`);
      setUsers(prev => prev.filter(u => u._id !== id));
      if (fromModal) setSelectedUser(null);
      toast.success('User deleted');
    } catch { toast.error('Failed'); }
  };

  const pages = Math.ceil(total / 15);

  return (
    <div>
      <div className="topbar">
        <h2>👥 Users</h2>
        <span style={{ color: 'var(--text-secondary)', fontSize: 14 }}>{total} total users</span>
      </div>

      <div className="table-wrap">
        <div className="table-header">
          <h3>All Users</h3>
          <div style={{ display: 'flex', gap: 10 }}>
            <div className="search-input">
              <Search size={15} color="var(--text-muted)" />
              <input placeholder="Search name or phone..." value={q}
                onChange={e => setQ(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && fetchUsers()} />
            </div>
            <button className="btn btn-primary btn-sm" onClick={fetchUsers}>Search</button>
          </div>
        </div>

        {loading ? <div className="spinner" /> : (
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Phone</th>
                <th>Location</th>
                <th>Status</th>
                <th>Joined</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map(user => (
                <tr key={user._id}>
                  <td onClick={() => fetchUserDetails(user._id)} style={{ cursor: 'pointer' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      {user.avatar ? (
                        <img src={user.avatar} alt="" style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover' }} />
                      ) : (
                        <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--navy)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 14, flexShrink: 0 }}>
                          {user.name?.[0]?.toUpperCase() || '?'}
                        </div>
                      )}
                      <div>
                        <p style={{ fontWeight: 600, color: 'var(--navy)' }}>{user.name}</p>
                        {user.businessName && <p style={{ fontSize: 11, color: 'var(--text-secondary)' }}>🏢 {user.businessName}</p>}
                      </div>
                    </div>
                  </td>
                  <td>{user.phone}</td>
                  <td>{user.location?.city ? `${user.location.city}${user.location.area ? `, ${user.location.area}` : ''}` : '—'}</td>
                  <td>
                    <span className={`badge ${user.isBanned ? 'badge-banned' : 'badge-active'}`}>
                      {user.isBanned ? 'Banned' : 'Active'}
                    </span>
                  </td>
                  <td>{new Date(user.createdAt).toLocaleDateString('en-IN')}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className={`btn btn-sm ${user.isBanned ? 'btn-success' : 'btn-warning'}`} onClick={() => toggleBan(user)}>
                        {user.isBanned ? <CheckCircle size={13} /> : <Ban size={13} />}
                        {user.isBanned ? 'Unban' : 'Ban'}
                      </button>
                      <button className="btn btn-danger btn-sm" onClick={() => deleteUser(user._id)}>
                        <Trash2 size={13} />
                      </button>
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

      {/* User Details Modal */}
      {selectedUser && (
        <div className="modal-overlay" onClick={() => setSelectedUser(null)}>
          <div className="modal" style={{ maxWidth: 800, width: '95%', maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 className="modal-title" style={{ margin: 0 }}>User Profile</h2>
              <button onClick={() => setSelectedUser(null)} style={{ padding: 4 }}><X size={20} color="var(--text-secondary)" /></button>
            </div>

            {detailsLoading || !userDetails ? <div className="spinner" /> : (
              <div>
                {/* Profile Header */}
                <div style={{ display: 'flex', gap: 20, marginBottom: 24, padding: 20, background: 'var(--bg)', borderRadius: 12 }}>
                  {userDetails.avatar ? (
                    <img src={userDetails.avatar} alt="" style={{ width: 80, height: 80, borderRadius: '50%', objectFit: 'cover' }} />
                  ) : (
                    <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'var(--navy)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 32, flexShrink: 0 }}>
                      {userDetails.name?.[0]?.toUpperCase() || '?'}
                    </div>
                  )}
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <h3 style={{ fontSize: 20, fontWeight: 800 }}>{userDetails.name}</h3>
                        {userDetails.businessName && <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginTop: 2 }}>🏢 {userDetails.businessName}</p>}
                        
                        <div style={{ display: 'flex', gap: 16, marginTop: 12 }}>
                          <span style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 4 }}><Phone size={14} color="var(--text-secondary)"/> {userDetails.phone}</span>
                          <span style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 4 }}><MapPin size={14} color="var(--text-secondary)"/> {userDetails.location?.city ? `${userDetails.location.city}, ${userDetails.location.area}` : 'Location not set'}</span>
                        </div>
                      </div>
                      
                      <div style={{ display: 'flex', gap: 8, flexDirection: 'column', alignItems: 'flex-end' }}>
                        <span className={`badge ${userDetails.isBanned ? 'badge-banned' : 'badge-active'}`} style={{ fontSize: 13, padding: '4px 12px' }}>
                          {userDetails.isBanned ? 'Banned' : 'Active Account'}
                        </span>
                        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                          <button className={`btn btn-sm ${userDetails.isBanned ? 'btn-success' : 'btn-warning'}`} onClick={() => toggleBan(userDetails, true)}>
                            {userDetails.isBanned ? <CheckCircle size={14} /> : <Ban size={14} />}
                            {userDetails.isBanned ? 'Unban User' : 'Ban User'}
                          </button>
                          <button className="btn btn-danger btn-sm" onClick={() => deleteUser(userDetails._id, true)}>
                            <Trash2 size={14} /> Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Additional Info */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 28 }}>
                  <div style={{ padding: 16, border: '1px solid var(--border)', borderRadius: 12 }}>
                    <p style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600, marginBottom: 4 }}>JOINED DATE</p>
                    <p style={{ fontWeight: 600 }}>{new Date(userDetails.createdAt).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                  </div>
                  <div style={{ padding: 16, border: '1px solid var(--border)', borderRadius: 12 }}>
                    <p style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600, marginBottom: 4 }}>CONTACT PREFERENCE</p>
                    <p style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                      {userDetails.contactMode === 'call' ? <Phone size={14} /> : <MessageCircle size={14} />}
                      {userDetails.contactMode === 'call' ? 'Phone Calls' : 'In-app Chat'}
                      {userDetails.whatsappAvailable && <span style={{ color: '#16a34a', fontSize: 12, marginLeft: 4 }}>(+ WhatsApp)</span>}
                    </p>
                  </div>
                </div>

                {/* User Ads */}
                <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12, borderBottom: '1px solid var(--border)', paddingBottom: 8 }}>
                  Posted Ads ({userAds.length})
                </h3>
                
                {userAds.length === 0 ? (
                  <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '20px 0' }}>This user has not posted any ads yet.</p>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
                    {userAds.map(ad => (
                      <div key={ad._id} style={{ border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                        <div style={{ height: 120, background: '#f3f4f6', position: 'relative' }}>
                          <img src={ad.images[0]} alt={ad.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          <span className={`badge ${ad.status === 'active' ? 'badge-active' : ad.status === 'pending' ? 'badge-pending' : 'badge-rejected'}`} style={{ position: 'absolute', top: 8, right: 8, zoom: 0.8 }}>
                            {ad.status}
                          </span>
                        </div>
                        <div style={{ padding: 12, flex: 1 }}>
                          <p style={{ fontWeight: 600, fontSize: 13, marginBottom: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{ad.title}</p>
                          <p style={{ fontWeight: 800, color: 'var(--navy)', fontSize: 14 }}>₹{ad.price.toLocaleString('en-IN')}</p>
                          <p style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 }}>{ad.category}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
