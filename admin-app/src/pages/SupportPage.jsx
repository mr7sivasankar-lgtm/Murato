import { useState, useEffect } from 'react';
import api from '../api/axios';
import toast from 'react-hot-toast';

const STATUS_COLORS = {
  open:        { bg: '#fee2e2', color: '#991b1b', label: '🔴 Open' },
  in_progress: { bg: '#fef3c7', color: '#92400e', label: '🟡 In Progress' },
  resolved:    { bg: '#dcfce7', color: '#166534', label: '🟢 Resolved' },
};

export default function SupportPage() {
  const [tickets, setTickets] = useState([]);
  const [total,   setTotal]   = useState(0);
  const [loading, setLoading] = useState(true);
  const [filter,  setFilter]  = useState('');
  const [selected, setSelected] = useState(null);
  const [adminNote, setAdminNote] = useState('');

  useEffect(() => { fetchTickets(); }, [filter]);

  const fetchTickets = async () => {
    setLoading(true);
    try {
      const p = filter ? { status: filter } : {};
      const { data } = await api.get('/support', { params: p });
      setTickets(data.tickets || []);
      setTotal(data.total || 0);
    } catch { toast.error('Failed to load tickets'); }
    finally { setLoading(false); }
  };

  const updateTicket = async (id, updates) => {
    try {
      const { data } = await api.put(`/support/${id}`, updates);
      setTickets(prev => prev.map(t => t._id === id ? data : t));
      if (selected?._id === id) setSelected(data);
      toast.success('Updated');
    } catch { toast.error('Failed to update'); }
  };

  const deleteTicket = async (id) => {
    if (!confirm('Delete this ticket?')) return;
    try {
      await api.delete(`/support/${id}`);
      setTickets(prev => prev.filter(t => t._id !== id));
      if (selected?._id === id) setSelected(null);
      toast.success('Deleted');
    } catch { toast.error('Failed to delete'); }
  };

  const statusBadge = (s) => {
    const c = STATUS_COLORS[s] || STATUS_COLORS.open;
    return <span style={{ background: c.bg, color: c.color, fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 6 }}>{c.label}</span>;
  };

  return (
    <div className="page-content">
      <div className="page-header">
        <h1>Support / Complaints</h1>
        <span className="badge">{total} total</span>
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {['', 'open', 'in_progress', 'resolved'].map(s => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            style={{
              padding: '6px 14px', borderRadius: 20, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 13,
              background: filter === s ? 'var(--navy)' : '#f3f4f6',
              color:      filter === s ? 'white'       : '#374151',
            }}
          >
            {s === '' ? 'All' : STATUS_COLORS[s]?.label || s}
          </button>
        ))}
      </div>

      {loading ? <div className="spinner" /> : (
        <div style={{ display: 'grid', gridTemplateColumns: selected ? '1fr 1fr' : '1fr', gap: 16 }}>
          {/* Ticket list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {tickets.length === 0 && <p style={{ color: '#9ca3af', textAlign: 'center', padding: 40 }}>No tickets found</p>}
            {tickets.map(t => (
              <div
                key={t._id}
                onClick={() => { setSelected(t); setAdminNote(t.adminNote || ''); }}
                style={{
                  background: 'white', borderRadius: 12, padding: '14px 16px', cursor: 'pointer',
                  border: selected?._id === t._id ? '2px solid var(--navy)' : '1.5px solid #e5e7eb',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <p style={{ fontWeight: 700, fontSize: 14 }}>{t.subject}</p>
                  {statusBadge(t.status)}
                </div>
                <p style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}>
                  👤 {t.userId?.businessName || t.userId?.name} · 📱 {t.userId?.phone}
                </p>
                <p style={{ fontSize: 12, color: '#374151', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {t.message}
                </p>
                <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>
                  {new Date(t.createdAt).toLocaleString('en-IN')}
                </p>
              </div>
            ))}
          </div>

          {/* Detail panel */}
          {selected && (
            <div style={{ background: 'white', borderRadius: 12, padding: 20, border: '1.5px solid #e5e7eb', position: 'sticky', top: 20, alignSelf: 'start' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
                <h3 style={{ fontSize: 16, fontWeight: 800 }}>{selected.subject}</h3>
                <button onClick={() => setSelected(null)} style={{ background: '#f3f4f6', border: 'none', borderRadius: 8, padding: '4px 10px', cursor: 'pointer', fontSize: 12 }}>✕ Close</button>
              </div>

              <p style={{ fontSize: 12, color: '#6b7280', marginBottom: 12 }}>
                From: <strong>{selected.userId?.businessName || selected.userId?.name}</strong> ({selected.userId?.phone})<br />
                {new Date(selected.createdAt).toLocaleString('en-IN')}
              </p>

              <div style={{ background: '#f9fafb', borderRadius: 10, padding: '12px 14px', marginBottom: 16 }}>
                <p style={{ fontSize: 14, lineHeight: 1.6, color: '#374151' }}>{selected.message}</p>
              </div>

              {/* Status update */}
              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 12, fontWeight: 700, color: '#6b7280', display: 'block', marginBottom: 6 }}>Update Status</label>
                <div style={{ display: 'flex', gap: 6 }}>
                  {['open', 'in_progress', 'resolved'].map(s => (
                    <button
                      key={s}
                      onClick={() => updateTicket(selected._id, { status: s })}
                      style={{
                        flex: 1, padding: '7px 4px', borderRadius: 8, border: 'none', cursor: 'pointer',
                        fontSize: 11, fontWeight: 700,
                        background: selected.status === s ? STATUS_COLORS[s]?.bg : '#f3f4f6',
                        color:      selected.status === s ? STATUS_COLORS[s]?.color : '#6b7280',
                      }}
                    >
                      {STATUS_COLORS[s]?.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Admin note */}
              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 12, fontWeight: 700, color: '#6b7280', display: 'block', marginBottom: 6 }}>Admin Note (internal)</label>
                <textarea
                  value={adminNote}
                  onChange={e => setAdminNote(e.target.value)}
                  rows={3}
                  placeholder="Add internal notes..."
                  style={{ width: '100%', border: '1.5px solid #e5e7eb', borderRadius: 8, padding: '8px 10px', fontSize: 13, resize: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }}
                />
                <button
                  onClick={() => updateTicket(selected._id, { adminNote })}
                  style={{ marginTop: 6, padding: '7px 16px', background: 'var(--navy)', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 700, fontSize: 13 }}
                >
                  Save Note
                </button>
              </div>

              <button
                onClick={() => deleteTicket(selected._id)}
                style={{ color: '#ef4444', background: '#fee2e2', border: 'none', borderRadius: 8, padding: '8px 16px', cursor: 'pointer', fontWeight: 700, fontSize: 13 }}
              >
                🗑 Delete Ticket
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
