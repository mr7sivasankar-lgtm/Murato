import { useState, useEffect } from 'react';
import { Search, Ban, Trash2, CheckCircle } from 'lucide-react';
import api from '../api/axios';
import toast from 'react-hot-toast';

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);

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

  const toggleBan = async (user) => {
    try {
      await api.put(`/admin/users/${user._id}/ban`, { isBanned: !user.isBanned });
      setUsers(prev => prev.map(u => u._id === user._id ? { ...u, isBanned: !u.isBanned } : u));
      toast.success(user.isBanned ? 'User unbanned' : 'User banned');
    } catch { toast.error('Failed'); }
  };

  const deleteUser = async (id) => {
    if (!confirm('Delete this user permanently?')) return;
    try {
      await api.delete(`/admin/users/${id}`);
      setUsers(prev => prev.filter(u => u._id !== id));
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
                <th>Shop</th>
                <th>Status</th>
                <th>Joined</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map(user => (
                <tr key={user._id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--navy)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 14, flexShrink: 0 }}>
                        {user.name[0].toUpperCase()}
                      </div>
                      <div>
                        <p style={{ fontWeight: 600 }}>{user.name}</p>
                        <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{user.email || 'No email'}</p>
                      </div>
                    </div>
                  </td>
                  <td>{user.phone}</td>
                  <td>{user.shopId ? '🏪 Yes' : '—'}</td>
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
    </div>
  );
}
