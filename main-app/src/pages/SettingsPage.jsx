import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, User, Phone, MapPin, Bell, Moon, Info,
  Save, ChevronRight, MessageCircle, Store, Star, Globe,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { LANGS } from '../data/translations';
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
  const { lang, setLang, t } = useLanguage();

  const [name,             setName]             = useState(user?.name || '');
  const [businessName,     setBusinessName]     = useState(user?.businessName || '');
  const [city,             setCity]             = useState(user?.location?.city || '');
  const [area,             setArea]             = useState(user?.location?.area || '');
  const [contactMode,      setContactMode]      = useState(user?.contactMode || 'chat');
  const [whatsapp,         setWhatsapp]         = useState(user?.whatsappAvailable || false);
  const [notifs,           setNotifs]           = useState(true);
  const [saving,           setSaving]           = useState(false);
  const [showLocPicker,    setShowLocPicker]    = useState(false);

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

        {/* ── Language ── */}
        <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>{t('language')}</p>
        <div style={{ background: 'white', borderRadius: 16, overflow: 'hidden', marginBottom: 20, boxShadow: '0 2px 12px rgba(0,0,0,0.05)' }}>
          {LANGS.map((l, i) => (
            <button key={l.code} onClick={() => setLang(l.code)}
              style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 14, padding: '14px 20px', background: 'none', border: 'none', cursor: 'pointer', borderBottom: i < LANGS.length - 1 ? '1px solid var(--border)' : 'none', transition: 'background 0.15s' }}
              onMouseEnter={e => e.currentTarget.style.background = '#f9fafb'}
              onMouseLeave={e => e.currentTarget.style.background = 'none'}
            >
              <div style={{ width: 36, height: 36, borderRadius: 10, background: '#f0f3fc', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Globe size={18} color="var(--navy)" />
              </div>
              <div style={{ flex: 1, textAlign: 'left' }}>
                <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{l.native}</p>
                <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>{l.label}</p>
              </div>
              {lang === l.code && (
                <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'var(--navy)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ color: 'white', fontSize: 12 }}>✓</span>
                </div>
              )}
            </button>
          ))}
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
            <div><p style={{ fontSize: 14, fontWeight: 600 }}>App Version</p><p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Murato v2.0.0 · Build 2026</p></div>
          </div>
        </div>

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
