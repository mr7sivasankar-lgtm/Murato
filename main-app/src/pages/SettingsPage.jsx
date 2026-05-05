import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, User, Phone, MapPin, Bell, Moon, Info,
  Save, ChevronRight, MessageCircle, Store, Star, TicketCheck, Clock,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import LocationPicker from '../components/LocationPicker';
import api from '../api/axios';
import toast from 'react-hot-toast';

const Toggle = ({ value, onChange, disabled }) => (
  <button
    type="button"
    onClick={() => !disabled && onChange(!value)}
    style={{
      width: 46, height: 26, borderRadius: 13, border: 'none', cursor: disabled ? 'default' : 'pointer',
      background: value ? 'var(--navy)' : '#e5e7eb',
      position: 'relative', transition: 'background 0.2s', opacity: disabled ? 0.5 : 1, flexShrink: 0,
    }}
  >
    <div style={{
      width: 20, height: 20, borderRadius: '50%', background: 'white',
      position: 'absolute', top: 3, left: value ? 23 : 3,
      transition: 'left 0.2s', boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
    }} />
  </button>
);

const Row = ({ icon, iconBg, iconColor, title, sub, right }) => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderBottom: '1px solid var(--border)' }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 }}>
      <div style={{ width: 36, height: 36, borderRadius: 10, background: iconBg || '#f0f3fc', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        {icon}
      </div>
      <div style={{ minWidth: 0 }}>
        <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{title}</p>
        {sub && <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 1 }}>{sub}</p>}
      </div>
    </div>
    {right}
  </div>
);

export default function SettingsPage() {
  const navigate  = useNavigate();
  const { user, updateUser, logout } = useAuth();

  const [name,             setName]             = useState(user?.name || '');
  const [businessName,     setBusinessName]     = useState(user?.businessName || '');
  const [city,             setCity]             = useState(user?.location?.city || '');
  const [area,             setArea]             = useState(user?.location?.area || '');
  const [contactMode,      setContactMode]      = useState(user?.contactMode || 'chat');
  const [whatsapp,         setWhatsapp]         = useState(user?.whatsappAvailable || false);
  const [notifs,           setNotifs]           = useState(true);
  const [saving,           setSaving]           = useState(false);
  const [showLocPicker,    setShowLocPicker]    = useState(false);

  // Support ticket state
  const [showSupport,    setShowSupport]    = useState(false);
  const [ticketSubject,  setTicketSubject]  = useState('');
  const [ticketMsg,      setTicketMsg]      = useState('');
  const [ticketSending,  setTicketSending]  = useState(false);
  const [myTickets,      setMyTickets]      = useState([]);
  const [ticketsLoading, setTicketsLoading] = useState(false);

  useEffect(() => {
    const loadTickets = async () => {
      setTicketsLoading(true);
      try {
        const { data } = await api.get('/support/my');
        setMyTickets(data);
      } catch { /* silent */ }
      finally { setTicketsLoading(false); }
    };
    loadTickets();
  }, []);

  const handleSave = async () => {
    if (!name.trim()) { toast.error('Name cannot be empty'); return; }
    setSaving(true);
    try {
      const { data } = await api.put('/auth/profile', {
        name: name.trim(),
        businessName: businessName.trim(),
        city: city.trim(),
        area: area.trim(),
        contactMode,
        whatsappAvailable: whatsapp,
      });
      updateUser({ ...data, token: localStorage.getItem('murato_token') });
      toast.success('Profile updated! ✅');
    } catch {
      // Fallback: update locally if API fails
      updateUser({
        name: name.trim(), businessName: businessName.trim(),
        location: { ...user?.location, city: city.trim(), area: area.trim() },
        contactMode, whatsappAvailable: whatsapp,
      });
      toast.success('Saved locally ✅');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page page-enter" style={{ paddingBottom: 100 }}>

      {/* Header */}
      <div className="page-header" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={() => navigate(-1)} style={{ color: 'var(--navy)', padding: 4 }}>
          <ArrowLeft size={22} />
        </button>
        <h1 style={{ fontSize: 18, fontWeight: 800, color: 'var(--navy)' }}>Settings</h1>
      </div>

      <div className="container" style={{ paddingTop: 20 }}>

        {/* ── Profile section ── */}
        <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>Account</p>
        <div style={{ background: 'white', borderRadius: 16, overflow: 'hidden', marginBottom: 20, boxShadow: '0 2px 12px rgba(0,0,0,0.05)' }}>

          {/* Avatar row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '18px 20px 16px', borderBottom: '1px solid var(--border)' }}>
            <div className="avatar-placeholder avatar-lg" style={{ fontSize: 22, flexShrink: 0, borderRadius: 16 }}>
              {(name?.[0] || '?').toUpperCase()}
            </div>
            <div>
              <p style={{ fontWeight: 700, fontSize: 16, color: 'var(--text-primary)' }}>{user?.name || 'User'}</p>
              <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>{user?.phone}</p>
              {user?.ratingAvg > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
                  <Star size={12} fill="#f5c518" color="#f5c518" />
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#1a2b5f' }}>{user.ratingAvg.toFixed(1)} · {user.ratingCount} reviews</span>
                </div>
              )}
            </div>
          </div>

          <div style={{ padding: '16px 20px' }}>
            <div className="form-group">
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <User size={13} color="var(--navy)" /> Full Name
              </label>
              <input className="form-input" placeholder="Your full name" value={name} onChange={e => setName(e.target.value)} />
            </div>

            <div className="form-group">
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Store size={13} color="var(--navy)" /> Business / Shop Name <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 400 }}>(optional)</span>
              </label>
              <input className="form-input" placeholder="e.g., Sri Balaji Steel" value={businessName} onChange={e => setBusinessName(e.target.value)} />
            </div>

            <div className="form-group">
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Phone size={13} color="var(--navy)" /> Phone Number
              </label>
              <div style={{ display: 'flex', alignItems: 'center', background: 'var(--bg)', borderRadius: 10, border: '1.5px solid var(--border)', padding: '12px 16px', gap: 8 }}>
                <span style={{ fontSize: 14, color: 'var(--text-secondary)', flex: 1 }}>{user?.phone || '—'}</span>
                <span style={{ fontSize: 11, background: '#dcfce7', color: '#166534', borderRadius: 6, padding: '2px 8px', fontWeight: 600 }}>✅ Verified</span>
              </div>
            </div>

            <div>
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <MapPin size={13} color="var(--navy)" /> Location
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
                <input className="form-input" placeholder="City" value={city} onChange={e => setCity(e.target.value)} />
                <input className="form-input" placeholder="Area" value={area} onChange={e => setArea(e.target.value)} />
              </div>
              <button
                onClick={() => setShowLocPicker(true)}
                style={{ fontSize: 12, color: 'var(--navy)', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', gap: 4 }}
              >
                <MapPin size={12} /> Search / Pick on map <ChevronRight size={12} />
              </button>
            </div>
          </div>
        </div>

        {/* ── Contact Preferences ── */}
        <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>Contact Preferences</p>
        <div style={{ background: 'white', borderRadius: 16, overflow: 'hidden', marginBottom: 20, boxShadow: '0 2px 12px rgba(0,0,0,0.05)' }}>

          {/* Contact mode */}
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
            <p style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>How buyers can reach you</p>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>Controls who can see your phone number on your ads</p>
            <div style={{ display: 'flex', gap: 8 }}>
              {[
                { val: 'chat', icon: '💬', label: 'Chat Only', sub: 'In-app messages only' },
                { val: 'direct', icon: '📞', label: 'Allow Call', sub: 'Show phone number' },
              ].map(opt => (
                <button
                  key={opt.val}
                  type="button"
                  onClick={() => setContactMode(opt.val)}
                  style={{
                    flex: 1, padding: '10px 8px', borderRadius: 10,
                    border: `2px solid ${contactMode === opt.val ? 'var(--navy)' : 'var(--border)'}`,
                    background: contactMode === opt.val ? '#f0f3fc' : 'white', cursor: 'pointer', textAlign: 'center',
                  }}
                >
                  <p style={{ fontSize: 16, marginBottom: 2 }}>{opt.icon}</p>
                  <p style={{ fontSize: 12, fontWeight: 700, color: contactMode === opt.val ? 'var(--navy)' : 'var(--text-secondary)' }}>{opt.label}</p>
                  <p style={{ fontSize: 10, color: 'var(--text-muted)' }}>{opt.sub}</p>
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>💬</div>
              <div>
                <p style={{ fontSize: 14, fontWeight: 600 }}>WhatsApp Available</p>
                <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Buyers can message via WhatsApp</p>
              </div>
            </div>
            <Toggle value={whatsapp} onChange={setWhatsapp} />
          </div>
        </div>

        {/* ── App Preferences ── */}
        <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>Preferences</p>
        <div style={{ background: 'white', borderRadius: 16, overflow: 'hidden', marginBottom: 20, boxShadow: '0 2px 12px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderBottom: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: '#e0f2fe', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Bell size={18} color="#0284c7" /></div>
              <div><p style={{ fontSize: 14, fontWeight: 600 }}>Push Notifications</p><p style={{ fontSize: 12, color: 'var(--text-muted)' }}>New messages & deals</p></div>
            </div>
            <Toggle value={notifs} onChange={setNotifs} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Moon size={18} color="#374151" /></div>
              <div><p style={{ fontSize: 14, fontWeight: 600 }}>Dark Mode</p><p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Coming soon</p></div>
            </div>
            <Toggle value={false} onChange={() => toast('Coming soon! 🌙')} disabled />
          </div>
        </div>

        {/* App version */}
        <div style={{ background: 'white', borderRadius: 16, overflow: 'hidden', marginBottom: 24, boxShadow: '0 2px 12px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', alignItems: 'center', padding: '14px 20px', gap: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Info size={18} color="#d97706" /></div>
            <div><p style={{ fontSize: 14, fontWeight: 600 }}>App Version</p><p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Myillo v2.0.0 · Build 2026</p></div>
          </div>
        </div>

        {/* ── Support ── */}
        <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>Support</p>
        <div style={{ background: 'white', borderRadius: 16, overflow: 'hidden', marginBottom: 20, boxShadow: '0 2px 12px rgba(0,0,0,0.05)' }}>

          {/* Contact support button */}
          <div
            onClick={() => setShowSupport(s => !s)}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderBottom: showSupport ? '1px solid var(--border)' : 'none', cursor: 'pointer' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: '#fce7f3', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>🎫</div>
              <div>
                <p style={{ fontSize: 14, fontWeight: 600 }}>Contact Support</p>
                <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Report issues or get help</p>
              </div>
            </div>
            <ChevronRight size={16} color="var(--text-muted)" style={{ transform: showSupport ? 'rotate(90deg)' : 'none', transition: '0.2s' }} />
          </div>

          {showSupport && (
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
              <div className="form-group">
                <label className="form-label">Subject *</label>
                <input className="form-input" placeholder="e.g. Payment issue, Fake listing..." value={ticketSubject} onChange={e => setTicketSubject(e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Message *</label>
                <textarea className="form-input" rows={4} placeholder="Describe your issue in detail..." value={ticketMsg} onChange={e => setTicketMsg(e.target.value)} style={{ resize: 'vertical' }} />
              </div>
              <button
                disabled={ticketSending}
                onClick={async () => {
                  if (!ticketSubject.trim() || !ticketMsg.trim()) { toast.error('Fill all fields'); return; }
                  setTicketSending(true);
                  try {
                    const { data } = await api.post('/support', { subject: ticketSubject.trim(), message: ticketMsg.trim() });
                    setMyTickets(prev => [data, ...prev]);
                    setTicketSubject(''); setTicketMsg(''); setShowSupport(false);
                    toast.success('Ticket submitted! ✅ We will respond soon.');
                  } catch { toast.error('Failed to submit'); }
                  finally { setTicketSending(false); }
                }}
                className="btn btn-primary"
                style={{ borderRadius: 50, fontWeight: 700, fontSize: 14, opacity: ticketSending ? 0.7 : 1 }}
              >
                📨 {ticketSending ? 'Sending...' : 'Send Message'}
              </button>
            </div>
          )}
        </div>

        {/* My Tickets */}
        {myTickets.length > 0 && (
          <>
            <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>My Tickets</p>
            <div style={{ marginBottom: 24, display: 'flex', flexDirection: 'column', gap: 12 }}>
              {myTickets.map(tk => {
                const statusColor = tk.status === 'resolved' ? '#10b981' : tk.status === 'in_progress' ? '#f59e0b' : '#6b7280';
                const statusLabel = tk.status === 'resolved' ? '✅ Resolved' : tk.status === 'in_progress' ? '⏳ In Progress' : '🔴 Open';
                return (
                  <div key={tk._id} style={{ background: 'white', borderRadius: 16, overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,0.05)', border: `1.5px solid ${statusColor}22` }}>
                    <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, borderBottom: tk.adminNote ? '1px solid var(--border)' : 'none' }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 3 }}>{tk.subject}</p>
                        <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tk.message}</p>
                        <p style={{ fontSize: 11, color: '#9ca3af' }}>{new Date(tk.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>
                      </div>
                      <span style={{ fontSize: 11, fontWeight: 700, color: statusColor, background: `${statusColor}18`, borderRadius: 20, padding: '4px 10px', whiteSpace: 'nowrap', flexShrink: 0 }}>{statusLabel}</span>
                    </div>
                    {tk.adminNote && (
                      <div style={{ padding: '12px 16px', background: '#f0f9ff', display: 'flex', gap: 10 }}>
                        <div style={{ width: 28, height: 28, borderRadius: 8, background: 'var(--navy)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, flexShrink: 0 }}>👨‍💼</div>
                        <div>
                          <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--navy)', marginBottom: 3 }}>Admin Response</p>
                          <p style={{ fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.5 }}>{tk.adminNote}</p>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* Save */}
        <button onClick={handleSave} disabled={saving} className="btn btn-primary" style={{ borderRadius: 50, fontWeight: 800, fontSize: 16, marginBottom: 12 }}>
          <Save size={16} /> {saving ? 'Saving...' : 'Save Changes'}
        </button>

        {/* Logout */}
        <button
          onClick={() => { logout(); navigate('/login'); toast.success('Logged out'); }}
          className="btn"
          style={{ borderRadius: 50, background: '#fee2e2', color: 'var(--danger)', fontWeight: 700 }}
        >
          🚪 Log Out
        </button>
      </div>

      {/* Location Picker */}
      <LocationPicker
        isOpen={showLocPicker}
        onClose={() => setShowLocPicker(false)}
        onSelect={({ city: c, area: a }) => { setCity(c); setArea(a || ''); }}
        currentCity={city}
      />
    </div>
  );
}
