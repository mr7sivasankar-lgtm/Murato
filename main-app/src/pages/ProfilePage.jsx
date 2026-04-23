import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronRight, Heart, ClipboardList, MessageCircle,
  Settings, LogOut, Star, MapPin, Phone, MessageSquare, Edit3, LifeBuoy, X, Lock,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import api from '../api/axios';
import toast from 'react-hot-toast';

const MenuItem = ({ icon, label, sub, onClick, color = 'var(--navy)' }) => (
  <div className="profile-menu-item" onClick={onClick}>
    <div className="profile-menu-icon" style={{ background: color + '18', color }}>
      {icon}
    </div>
    <div style={{ flex: 1 }}>
      <span className="profile-menu-label">{label}</span>
      {sub && <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>{sub}</p>}
    </div>
    <ChevronRight size={16} color="var(--text-muted)" />
  </div>
);

export default function ProfilePage() {
  const navigate  = useNavigate();
  const { user, logout } = useAuth();
  const { t } = useLanguage();
  const [adsCount,      setAdsCount]      = useState(0);
  const [showSupport,   setShowSupport]   = useState(false);
  const [supportSubject, setSupportSubject] = useState('');
  const [supportMsg,    setSupportMsg]    = useState('');
  const [showChangePin, setShowChangePin] = useState(false);
  const [currentPin,    setCurrentPin]    = useState('');
  const [newPin,        setNewPin]        = useState('');
  const [changingPin,   setChangingPin]   = useState(false);
  const [sending,       setSending]       = useState(false);

  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    api.get(`/ads/user/${user._id || user.id}`)
      .then(r => setAdsCount(r.data?.length || 0))
      .catch(() => {});
  }, []);

  const handleChangePinSubmit = async () => {
    if (!/^\d{4}$/.test(newPin)) { toast.error('New PIN must be 4 digits'); return; }
    setChangingPin(true);
    try {
      await api.put('/auth/change-pin', { currentPin, newPin });
      toast.success('PIN changed successfully! 🔒');
      setShowChangePin(false);
      setCurrentPin(''); setNewPin('');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to change PIN');
    } finally { setChangingPin(false); }
  };

  const handleLogout = () => {
    logout();
    toast.success('Logged out');
    navigate('/login');
  };

  const handleSupportSubmit = async () => {
    if (!supportSubject.trim() || !supportMsg.trim())
      return toast.error('Please fill subject and message');
    setSending(true);
    try {
      await api.post('/support', { subject: supportSubject, message: supportMsg });
      toast.success('✅ Support request sent!');
      setShowSupport(false);
      setSupportSubject('');
      setSupportMsg('');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send');
    } finally {
      setSending(false);
    }
  };

  const contactModeLabel = user?.contactMode === 'direct' ? t('directCallAllowed') : t('chatOnly');

  return (
    <div className="page page-enter" style={{ paddingBottom: 90 }}>

      {/* ── Hero ── */}
      <div style={{
        background: 'linear-gradient(160deg, #0f1d45 0%, #1a2b5f 50%, #243680 100%)',
        padding: '52px 20px 24px',
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
          {/* Avatar */}
          <div style={{
            width: 72, height: 72, borderRadius: 20,
            background: 'linear-gradient(135deg, #f5c518, #e0b200)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 28, fontWeight: 900, color: '#1a2b5f', flexShrink: 0,
            boxShadow: '0 4px 16px rgba(245,197,24,0.4)',
          }}>
            {(user?.name || '?')[0].toUpperCase()}
          </div>
          <div style={{ flex: 1 }}>
            <h2 style={{ fontSize: 20, fontWeight: 900, color: 'white', lineHeight: 1.1, marginBottom: 2 }}>
              {user?.businessName || user?.name}
            </h2>
            {user?.businessName && (
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', marginBottom: 4 }}>{user.name}</p>
            )}
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)', marginBottom: 4 }}>
              📱 {user?.phone}
            </p>
            {user?.location?.city && (
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', display: 'flex', alignItems: 'center', gap: 4 }}>
                <MapPin size={11} /> {user.location.city}{user.location.area ? `, ${user.location.area}` : ''}
              </p>
            )}
          </div>
          <button
            onClick={() => navigate('/settings')}
            style={{ color: 'rgba(255,255,255,0.7)', background: 'rgba(255,255,255,0.12)', border: 'none', borderRadius: 10, padding: 8, cursor: 'pointer', display: 'flex' }}
          >
            <Edit3 size={18} />
          </button>
        </div>

        {/* Stats row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginTop: 20 }}>
          {[
            { label: t('adsPosted'), value: adsCount },
            { label: t('rating'), value: user?.ratingAvg > 0 ? `⭐ ${user.ratingAvg.toFixed(1)}` : '—' },
            { label: t('reviews'), value: user?.ratingCount || 0 },
          ].map(s => (
            <div key={s.label} style={{ background: 'rgba(255,255,255,0.1)', borderRadius: 12, padding: '10px', textAlign: 'center' }}>
              <p style={{ fontSize: 18, fontWeight: 900, color: 'white' }}>{s.value}</p>
              <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.6)', marginTop: 2 }}>{s.label}</p>
            </div>
          ))}
        </div>

        {/* Contact mode pill */}
        <div style={{ marginTop: 14 }}>
          <span style={{ fontSize: 11, fontWeight: 600, background: 'rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.85)', padding: '5px 12px', borderRadius: 20, display: 'inline-block' }}>
            {contactModeLabel}
          </span>
          {user?.whatsappAvailable && (
            <span style={{ fontSize: 11, fontWeight: 600, background: 'rgba(37,211,102,0.2)', color: '#25d366', padding: '5px 12px', borderRadius: 20, display: 'inline-block', marginLeft: 6 }}>
              {t('whatsapp')}
            </span>
          )}
        </div>
      </div>

      {/* ── View my profile as seller ── */}
      <div style={{ padding: '12px 20px 0' }}>
        <button
          onClick={() => navigate(`/seller/${user?._id || user?.id}`)}
          style={{ width: '100%', padding: '12px', borderRadius: 12, background: '#f0f3fc', border: '1.5px solid #d1d9ef', color: 'var(--navy)', fontWeight: 700, fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, cursor: 'pointer' }}
        >
          {t('viewSellerProfile')}
        </button>
      </div>

      {/* ── Menu ── */}
      <div style={{ background: 'white', marginTop: 16, marginBottom: 12, boxShadow: '0 1px 6px rgba(0,0,0,0.05)' }}>
        <MenuItem icon={<ClipboardList size={18} />} label={t('myAds')} sub={`${adsCount} posted`} onClick={() => navigate('/my-ads')} />
        <MenuItem icon={<Heart size={18} />} label={t('savedFavorites')} onClick={() => navigate('/favorites')} color="#ef4444" />
        <MenuItem icon={<MessageCircle size={18} />} label={t('myChats')} onClick={() => navigate('/chats')} />
      </div>

      <div style={{ background: 'white', marginBottom: 12, boxShadow: '0 1px 6px rgba(0,0,0,0.05)' }}>
        <MenuItem icon={<Settings size={18} />} label={t('settings')} sub={t('editProfilePref')} onClick={() => navigate('/settings')} color="#6b7280" />
        <MenuItem icon={<Lock size={18} />} label={t('changePin')} sub={t('updatePin')} onClick={() => setShowChangePin(true)} color="#8b5cf6" />
        <MenuItem icon={<LifeBuoy size={18} />} label={t('support')} sub={t('reportIssue')} onClick={() => setShowSupport(true)} color="#f59e0b" />
      </div>

      <div style={{ background: 'white', boxShadow: '0 1px 6px rgba(0,0,0,0.05)' }}>
        <div className="profile-menu-item" onClick={handleLogout}>
          <div className="profile-menu-icon" style={{ background: '#fee2e2' }}>
            <LogOut size={18} color="var(--danger)" />
          </div>
          <span className="profile-menu-label" style={{ color: 'var(--danger)' }}>{t('logOut')}</span>
          <ChevronRight size={16} color="var(--danger)" />
        </div>
      </div>

      {/* ── Change PIN Sheet ── */}
      {showChangePin && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 3000 }}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)' }} onClick={() => setShowChangePin(false)} />
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'white', borderRadius: '24px 24px 0 0', padding: '20px 20px 40px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
              <h3 style={{ fontSize: 17, fontWeight: 800, color: 'var(--navy)' }}>🔒 Change PIN</h3>
              <button onClick={() => setShowChangePin(false)} style={{ background: '#f3f4f6', border: 'none', borderRadius: 8, padding: 6, cursor: 'pointer', display: 'flex' }}><X size={18} /></button>
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>Current PIN</label>
              <input className="form-input" type="password" inputMode="numeric" maxLength={4} placeholder="••••" value={currentPin} onChange={e => setCurrentPin(e.target.value.replace(/\D/g,'').slice(0,4))} style={{ letterSpacing: 8, fontSize: 20, textAlign: 'center' }} />
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>New PIN</label>
              <input className="form-input" type="password" inputMode="numeric" maxLength={4} placeholder="••••" value={newPin} onChange={e => setNewPin(e.target.value.replace(/\D/g,'').slice(0,4))} style={{ letterSpacing: 8, fontSize: 20, textAlign: 'center' }} />
            </div>
            <button className="btn btn-primary" style={{ width: '100%', borderRadius: 50 }} onClick={handleChangePinSubmit} disabled={changingPin}>
              {changingPin ? 'Saving...' : 'Update PIN'}
            </button>
          </div>
        </div>
      )}

      {/* ── Support Sheet ── */}
      {showSupport && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 3000 }}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)' }} onClick={() => setShowSupport(false)} />
          <div style={{
            position: 'absolute', bottom: 0, left: 0, right: 0,
            background: 'white', borderRadius: '24px 24px 0 0', padding: '20px 20px 40px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
              <h3 style={{ fontSize: 17, fontWeight: 800, color: 'var(--navy)' }}>🛟 Contact Support</h3>
              <button onClick={() => setShowSupport(false)} style={{ background: '#f3f4f6', border: 'none', borderRadius: 8, padding: 6, cursor: 'pointer', display: 'flex' }}>
                <X size={18} />
              </button>
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>Subject *</label>
              <input
                className="form-input"
                placeholder="e.g. Payment issue, Fake listing..."
                value={supportSubject}
                onChange={e => setSupportSubject(e.target.value)}
              />
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>Message *</label>
              <textarea
                className="form-input"
                placeholder="Describe your issue in detail..."
                rows={4}
                value={supportMsg}
                onChange={e => setSupportMsg(e.target.value)}
                style={{ resize: 'none', fontFamily: 'inherit' }}
              />
            </div>
            <button
              className="btn btn-primary"
              style={{ width: '100%', borderRadius: 50 }}
              onClick={handleSupportSubmit}
              disabled={sending}
            >
              {sending ? 'Sending...' : '📨 Send Message'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
