import { useState, useEffect } from 'react';
import api from '../api/axios';
import toast from 'react-hot-toast';
import { Settings, Save, Radio } from 'lucide-react';

export default function SettingsPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  // Search radius state
  const [searchRadius, setSearchRadius] = useState(25);
  const [radiusLoading, setRadiusLoading] = useState(false);
  const [radiusSaving, setRadiusSaving] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setRadiusLoading(true);
    try {
      const { data } = await api.get('/admin/settings');
      if (data.searchRadius) setSearchRadius(Number(data.searchRadius.value));
    } catch { /* non-critical */ }
    finally { setRadiusLoading(false); }
  };

  const handleRadiusSave = async () => {
    const val = Number(searchRadius);
    if (isNaN(val) || val < 1 || val > 500) {
      toast.error('Radius must be between 1 and 500 km');
      return;
    }
    setRadiusSaving(true);
    try {
      await api.put('/admin/settings', { key: 'searchRadius', value: val, label: 'Search Radius (km)' });
      toast.success(`Search radius updated to ${val} km ✅`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update radius');
    } finally {
      setRadiusSaving(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Both email and password are required');
      return;
    }
    if (password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    setLoading(true);
    try {
      await api.put('/admin/credentials', { email, password });
      toast.success('Admin credentials updated successfully! ✅');
      setEmail('');
      setPassword('');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="topbar">
        <div>
          <h2><Settings size={22} style={{ verticalAlign: 'text-bottom', marginRight: 8 }} /> Settings</h2>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>Manage your admin account and app configuration</p>
        </div>
      </div>

      {/* ── Search Radius Control ── */}
      <div style={{ maxWidth: 500, background: 'white', borderRadius: 'var(--radius)', padding: 24, boxShadow: 'var(--shadow)', marginTop: 24 }}>
        <h3 style={{ marginBottom: 6, fontSize: 18, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Radio size={20} color="#f59e0b" /> Search Radius
        </h3>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 20 }}>
          Controls how far (in km) from a user's location ads are shown. Changes take effect immediately for all users — no code change needed.
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <input
              type="number"
              min={1}
              max={500}
              value={radiusLoading ? '…' : searchRadius}
              onChange={e => setSearchRadius(e.target.value)}
              disabled={radiusLoading}
              style={{
                width: '100%', padding: '10px 14px',
                border: '1.5px solid var(--border)', borderRadius: 8,
                fontSize: 18, fontWeight: 700, color: 'var(--text-primary)',
              }}
            />
            <span style={{
              position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)',
              fontSize: 13, color: 'var(--text-muted)', fontWeight: 600,
            }}>km</span>
          </div>
          <button
            className="btn btn-primary"
            onClick={handleRadiusSave}
            disabled={radiusSaving || radiusLoading}
            style={{ display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' }}
          >
            <Save size={15} />
            {radiusSaving ? 'Saving…' : 'Save Radius'}
          </button>
        </div>
        <div style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {[10, 15, 25, 50, 100].map(v => (
            <button
              key={v}
              onClick={() => setSearchRadius(v)}
              style={{
                padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700,
                border: `1.5px solid ${searchRadius == v ? '#f59e0b' : 'var(--border)'}`,
                background: searchRadius == v ? '#fef3c7' : 'var(--bg)',
                color: searchRadius == v ? '#92400e' : 'var(--text-secondary)',
                cursor: 'pointer',
              }}
            >
              {v} km
            </button>
          ))}
        </div>
      </div>

      {/* ── Admin Credentials ── */}
      <div style={{ maxWidth: 500, background: 'white', borderRadius: 'var(--radius)', padding: 24, boxShadow: 'var(--shadow)', marginTop: 20 }}>
        <h3 style={{ marginBottom: 16, fontSize: 18, fontWeight: 700 }}>Change Admin Login</h3>
        <form onSubmit={handleSubmit}>
          <div className="form-group" style={{ marginBottom: 16 }}>
            <label className="form-label" style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 600 }}>New Admin Email</label>
            <input
              className="form-input"
              type="email"
              placeholder="e.g. admin@murato.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              style={{ width: '100%', padding: '10px 14px', border: '1.5px solid var(--border)', borderRadius: 8 }}
            />
          </div>

          <div className="form-group" style={{ marginBottom: 20 }}>
            <label className="form-label" style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 600 }}>New Password</label>
            <input
              className="form-input"
              type="text"
              placeholder="Enter new secure password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              style={{ width: '100%', padding: '10px 14px', border: '1.5px solid var(--border)', borderRadius: 8 }}
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
            style={{ width: '100%', justifyContent: 'center', display: 'flex', alignItems: 'center', gap: 8 }}
          >
            <Save size={16} />
            {loading ? 'Saving...' : 'Update Credentials'}
          </button>
        </form>
      </div>
    </div>
  );
}
