import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, SlidersHorizontal } from 'lucide-react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

export default function ChatsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [chats, setChats] = useState([]);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    fetchChats();
  }, [filter]);

  const fetchChats = async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/chat/mine', { params: { filter } });
      setChats(data);
    } catch { setChats([]); }
    finally { setLoading(false); }
  };

  const filtered = chats.filter(c => {
    const other = c.participants?.find(p => p._id !== user?._id);
    return !search || other?.name?.toLowerCase().includes(search.toLowerCase());
  });

  return (
    <div className="page page-enter">
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <h1 style={{ fontSize: 22, fontWeight: 800 }}>Chats</h1>
          <button style={{ color: 'var(--navy)', padding: 6 }}><SlidersHorizontal size={20} /></button>
        </div>

        {/* Search */}
        <div className="search-bar" style={{ marginBottom: 14 }}>
          <Search size={16} color="var(--text-muted)" />
          <input placeholder="Search Chat Here" value={search} onChange={e => setSearch(e.target.value)} />
          <span style={{ fontSize: 13, color: 'var(--navy)', fontWeight: 600 }}>+ Filters</span>
        </div>

        {/* Tabs */}
        <div className="tabs">
          {['all', 'buying', 'selling'].map(t => (
            <button key={t} className={`tab ${filter === t ? 'active' : ''}`} onClick={() => setFilter(t)}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="container" style={{ paddingTop: 8 }}>
        {loading ? <div className="spinner" /> : filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">💬</div>
            <p className="empty-title">No chats yet</p>
            <p className="empty-subtitle">Start chatting with sellers by viewing an ad</p>
          </div>
        ) : (
          <div>
            {filtered.map(chat => {
              const other = chat.participants?.find(p => p._id !== user?._id);
              const isBuying = chat.adId?.userId !== user?._id;
              const unread = chat.unreadCount?.[user?._id] || 0;
              return (
                <div key={chat._id} className="chat-item" onClick={() => navigate(`/chat/${chat._id}`)}>
                  <div className="avatar-placeholder avatar-md">{other?.name?.[0]?.toUpperCase()}</div>
                  <div className="chat-content">
                    <div className="chat-name">
                      {other?.name}
                      <span className={`badge ${isBuying ? 'badge-buying' : 'badge-selling'}`}>{isBuying ? 'Buying' : 'Selling'}</span>
                    </div>
                    <p className="chat-preview">{chat.lastMessage || 'Start conversation...'}</p>
                  </div>
                  <div className="chat-meta">
                    <span className="chat-time">
                      {chat.lastMessageAt ? new Date(chat.lastMessageAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : ''}
                    </span>
                    {unread > 0 && <span className="unread-badge">{unread}</span>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
