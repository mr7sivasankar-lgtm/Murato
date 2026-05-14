import { useState, useEffect } from 'react';
import { MapPin, Users, CheckCircle, XCircle, X, ToggleLeft, ToggleRight } from 'lucide-react';
import api from '../api/axios';
import toast from 'react-hot-toast';

export default function LocationTab() {
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null); // { city, isActive, reason }
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchLocations(); }, []);

  const fetchLocations = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/admin/locations');
      setLocations(data);
    } catch { toast.error('Failed to load locations'); }
    finally { setLoading(false); }
  };

  const openToggle = (loc) => {
    setModal(loc);
    setReason(loc.reason || '');
  };

  const handleToggle = async () => {
    if (!reason.trim()) { toast.error('Please provide a reason'); return; }
    setSaving(true);
    try {
      await api.put('/admin/locations/toggle', {
        city: modal.city,
        isActive: !modal.isServiceActive,
        reason: reason.trim(),
      });
      setLocations(p => p.map(l => l.city === modal.city
        ? { ...l, isServiceActive: !modal.isServiceActive, reason: reason.trim(), toggledAt: new Date() }
        : l
      ));
      toast.success(`Service ${!modal.isServiceActive ? 'activated' : 'deactivated'} for ${modal.city}`);
      setModal(null);
    } catch { toast.error('Failed'); }
    finally { setSaving(false); }
  };

  const activeCount  = locations.filter(l => l.isServiceActive).length;
  const blockedCount = locations.filter(l => !l.isServiceActive).length;
  const totalUsers   = locations.reduce((s, l) => s + l.userCount, 0);

  return (
    <div>
      {/* Header stats */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 24 }}>
        {[
          { label: 'Active Locations', value: activeCount,  color: '#dcfce7', tc: '#15803d', icon: '✅' },
          { label: 'Blocked Locations', value: blockedCount, color: '#fee2e2', tc: '#b91c1c', icon: '🚫' },
          { label: 'Users with Location', value: totalUsers, color: '#dbeafe', tc: '#1d4ed8', icon: '👥' },
        ].map(s => (
          <div key={s.label} style={{ flex: 1, background: s.color, borderRadius: 14, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
            <span style={{ fontSize: 28 }}>{s.icon}</span>
            <div>
              <div style={{ fontSize: 28, fontWeight: 900, color: s.tc, lineHeight: 1 }}>{s.value}</div>
              <div style={{ fontSize: 12, fontWeight: 600, color: s.tc, marginTop: 3 }}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {loading ? <div className="spinner" /> : locations.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--text-secondary)' }}>
          <p style={{ fontSize: 48, marginBottom: 12 }}>📍</p>
          <p style={{ fontWeight: 700, fontSize: 16 }}>No location data yet</p>
          <p style={{ fontSize: 14, marginTop: 6 }}>Users will appear here once they set their location in the app.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 18 }}>
          {locations.map(loc => (
            <div key={loc.city} style={{
              background: 'white',
              borderRadius: 16,
              padding: 20,
              boxShadow: 'var(--shadow)',
              border: `2px solid ${loc.isServiceActive ? '#bbf7d0' : '#fecaca'}`,
              transition: 'all 0.2s',
              position: 'relative',
              overflow: 'hidden',
            }}>
              {/* Color stripe */}
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 4, background: loc.isServiceActive ? 'linear-gradient(90deg,#10b981,#34d399)' : 'linear-gradient(90deg,#ef4444,#f87171)' }} />

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 42, height: 42, borderRadius: 12, background: loc.isServiceActive ? '#dcfce7' : '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>📍</div>
                  <div>
                    <h3 style={{ fontWeight: 800, fontSize: 16, color: 'var(--text-primary)' }}>{loc.city}</h3>
                    <span style={{ fontSize: 11, fontWeight: 700, color: loc.isServiceActive ? '#15803d' : '#b91c1c', background: loc.isServiceActive ? '#dcfce7' : '#fee2e2', padding: '2px 8px', borderRadius: 20 }}>
                      {loc.isServiceActive ? '● Active' : '● Blocked'}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => openToggle(loc)}
                  className={`btn btn-sm ${loc.isServiceActive ? 'btn-danger' : 'btn-success'}`}
                  style={{ gap: 5 }}
                >
                  {loc.isServiceActive ? <XCircle size={13} /> : <CheckCircle size={13} />}
                  {loc.isServiceActive ? 'Block' : 'Activate'}
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 12 }}>
                {[
                  { label: 'Total', value: loc.userCount,   color: '#f1f5f9' },
                  { label: 'Active', value: loc.activeCount, color: '#f0fdf4' },
                  { label: 'Banned', value: loc.bannedCount, color: '#fff1f2' },
                ].map(s => (
                  <div key={s.label} style={{ background: s.color, borderRadius: 10, padding: '10px', textAlign: 'center' }}>
                    <div style={{ fontSize: 20, fontWeight: 800 }}>{s.value}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 600 }}>{s.label}</div>
                  </div>
                ))}
              </div>

              {loc.reason && (
                <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10, padding: '8px 12px', fontSize: 12, color: '#92400e' }}>
                  <strong>Reason:</strong> {loc.reason}
                  {loc.toggledAt && <span style={{ float: 'right', opacity: 0.7 }}>{new Date(loc.toggledAt).toLocaleDateString('en-IN')}</span>}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Toggle Modal */}
      {modal && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal" style={{ maxWidth: 460 }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 className="modal-title" style={{ margin: 0 }}>
                {modal.isServiceActive ? '🚫 Block Service' : '✅ Activate Service'}
              </h3>
              <button onClick={() => setModal(null)}><X size={18} color="var(--text-secondary)" /></button>
            </div>

            <div style={{ background: 'var(--bg)', borderRadius: 12, padding: 16, marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 28 }}>📍</span>
                <div>
                  <p style={{ fontWeight: 800, fontSize: 16 }}>{modal.city}</p>
                  <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{modal.userCount} registered users</p>
                </div>
              </div>
            </div>

            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 6 }}>
              {modal.isServiceActive
                ? '⚠️ Blocking will prevent users in this location from using the service.'
                : '✅ Activating will restore service access for users in this location.'}
            </p>

            <div className="form-group" style={{ marginTop: 16 }}>
              <label className="form-label">Reason <span style={{ color: 'var(--danger)' }}>*</span></label>
              <textarea
                className="form-input"
                rows={3}
                placeholder={modal.isServiceActive ? 'e.g. Suspicious activity detected in this area…' : 'e.g. Issue resolved, service restored…'}
                value={reason}
                onChange={e => setReason(e.target.value)}
                style={{ resize: 'none' }}
              />
            </div>

            <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
              <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setModal(null)}>Cancel</button>
              <button
                className={`btn ${modal.isServiceActive ? 'btn-danger' : 'btn-success'}`}
                style={{ flex: 2, justifyContent: 'center' }}
                onClick={handleToggle}
                disabled={saving}
              >
                {saving ? 'Saving…' : modal.isServiceActive ? '🚫 Block This Location' : '✅ Activate This Location'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
